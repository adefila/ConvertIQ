import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string; pageContent?: string; fetchMethod?: string }
    const { url, pageContent, fetchMethod } = body

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const isCustom = fetchMethod === 'custom' && typeof pageContent === 'string' && pageContent.startsWith('CUSTOM_REWRITE:')
    const copyText = isCustom ? pageContent.replace('CUSTOM_REWRITE:\n', '') : ''
    const content = (pageContent || '').slice(0, 8000)

    const prompt = isCustom
      ? `You are a world-class CRO copywriter. Rewrite this website copy to be specific, outcome-focused, and conversion-optimized for ${url}. Return ONLY the rewritten copy, nothing else:\n\n${copyText}`
      : `You are a world-class CRO (Conversion Rate Optimization) strategist with 15+ years experience auditing websites for high-growth startups and Fortune 500 companies.

You are auditing: ${url}

REAL PAGE CONTENT extracted from the live website:
---
${content}
---

Your task: Read this page EXACTLY like a human scrolling top to bottom. Identify every distinct section you can see. For each section, QUOTE the actual copy you found — do not paraphrase or invent copy. Use the real headlines, CTAs, and text from the content above.

The Copy Rewriter tab will pull directly from each section's copy_rewrite field — so every section must have a copy_rewrite with the REAL original text quoted from the page.

Return ONLY a valid raw JSON object. No markdown. No code fences. No text before or after.

{
  "scores": {
    "conversion": <0-100 honest score>,
    "ux": <0-100>,
    "cta": <0-100>,
    "trust": <0-100>,
    "mobile": <0-100>
  },
  "score_notes": {
    "conversion": "<6-8 word verdict quoting something specific from the page>",
    "ux": "<6-8 word verdict>",
    "cta": "<6-8 word verdict quoting the actual CTA text found>",
    "trust": "<6-8 word verdict>",
    "mobile": "<6-8 word verdict>"
  },
  "sections": [
    {
      "name": "<descriptive section name e.g. Hero, Features Grid, Pricing Table, FAQ, Bottom CTA>",
      "score": <0-100>,
      "what_we_found": "<2-3 sentences describing exactly what this section contains — QUOTE actual copy from the page in quotes>",
      "issues": [
        {
          "severity": "high|medium|low",
          "what": "<specific issue — quote real copy where possible>",
          "why": "<exactly why this hurts conversion for this specific audience>",
          "fix": "<expert actionable fix with example rewritten copy>"
        }
      ],
      "copy_rewrite": {
        "label": "<what this copy is e.g. Hero Headline, Primary CTA, Feature Benefit, Section Headline>",
        "original": "<QUOTE the exact text from the page — this must be real copy found above>",
        "improved": "<expert CRO rewrite — outcome-focused, specific, conversion-optimized>"
      }
    }
  ],
  "overall_issues": [
    {
      "severity": "high|medium|low",
      "title": "<site-wide issue>",
      "description": "<2 sentences with specific evidence from the page>",
      "fix": "<expert fix with example>"
    }
  ],
  "copy": {
    "headline": {
      "original": "<QUOTE the actual H1 from the page>",
      "improved": "<outcome-driven rewrite specific to their product>"
    },
    "subheadline": {
      "original": "<QUOTE actual subheadline>",
      "improved": "<benefit-led rewrite>"
    },
    "cta": {
      "original": "<QUOTE actual primary CTA button text>",
      "improved": "<high-intent rewrite with friction reducer>"
    },
    "benefits": {
      "original": "<QUOTE actual benefits or features copy>",
      "improved": "<outcome-focused rewrite>"
    }
  },
  "recommendations": [
    {
      "icon": "<chart|shield|cursor|star|users|zap|target|eye|lock|trending>",
      "title": "<specific recommendation>",
      "description": "<2 sentences specific to what you found on this site>",
      "impact": "high|medium"
    }
  ],
  "layout": [
    {
      "title": "<structural change>",
      "description": "<why this matters for this specific site>"
    }
  ]
}

Rules:
- sections: identify 5-8 sections from the actual content — name them what they are
- Every copy_rewrite.original must be a REAL QUOTE from the page content above
- overall_issues: 3-4 site-wide problems with evidence
- recommendations: 6 items
- layout: 5 items
- Be honest — most sites score 40-65
- If content was not fetchable, analyze based on URL and domain knowledge and be transparent about it`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: isCustom ? 400 : 5000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Anthropic API error ${res.status}: ${errText.slice(0, 200)}` },
        { status: 500 }
      )
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const text = data.content?.[0]?.text ?? ''

    if (isCustom) {
      return NextResponse.json({
        ok: true,
        result: {
          scores: { conversion: 0, ux: 0, cta: 0, trust: 0, mobile: 0 },
          score_notes: { conversion: '', ux: '', cta: '', trust: '', mobile: '' },
          sections: [],
          overall_issues: [],
          copy: {
            headline: { original: copyText.slice(0, 150), improved: text.trim() },
            subheadline: { original: '', improved: '' },
            cta: { original: '', improved: '' },
            benefits: { original: '', improved: '' },
          },
          recommendations: [],
          layout: [],
        },
      })
    }

    let clean = text.replace(/```json[\r\n]?/g, '').replace(/```[\r\n]?/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1)

    const result = JSON.parse(clean)
    return NextResponse.json({ ok: true, result })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
