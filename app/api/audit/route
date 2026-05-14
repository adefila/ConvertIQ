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

    const prompt = isCustom
      ? `You are a world-class CRO copywriter. Rewrite this website copy to be outcome-focused, specific, and conversion-optimized for ${url}. Return ONLY the rewritten copy, nothing else:\n\n${copyText}`
      : `You are a world-class CRO (Conversion Rate Optimization) strategist with 15+ years of experience auditing websites for Y Combinator startups, Fortune 500 brands, and high-growth SaaS companies.

You are auditing: ${url}

REAL PAGE CONTENT extracted from the live website:
---
${(pageContent || 'No content fetched. Analyze based on the URL and domain name.').slice(0, 9000)}
---

Read this page exactly like a human scrolling from top to bottom. Identify each distinct section. Name each one descriptively based on what it actually contains — for example: "Opening hero with headline and CTA", "Three-column features grid", "Customer logos strip", "Pricing table", "FAQ accordion", "Bottom CTA banner".

For each section give an honest senior CRO assessment:
- What does it say and what is its job in the funnel?
- Is the copy specific (numbers, outcomes) or vague (powerful, easy, best)?
- What friction or confusion does it create?
- What exact change would you make today?

Return ONLY a valid raw JSON object. No markdown. No code fences. No text before or after.

{
  "scores": {
    "conversion": 54,
    "ux": 71,
    "cta": 43,
    "trust": 61,
    "mobile": 68
  },
  "score_notes": {
    "conversion": "Vague headline kills first impression",
    "ux": "Clean layout but weak hierarchy",
    "cta": "Learn More is too passive",
    "trust": "No logos or reviews above fold",
    "mobile": "CTA hidden below fold on mobile"
  },
  "sections": [
    {
      "name": "Opening hero with headline and CTA",
      "score": 45,
      "what_we_found": "The headline reads: Welcome to Our Platform. The primary CTA says Learn More. There is no subheadline explaining what the product does.",
      "issues": [
        {
          "severity": "high",
          "what": "Headline has zero outcome clarity",
          "why": "A cold visitor cannot understand the transformation they get in 3 seconds, increasing bounce rate.",
          "fix": "Replace with an outcome headline. Example: Cut Your Onboarding Time by 60% — No Engineering Changes Required."
        },
        {
          "severity": "high",
          "what": "Primary CTA says Learn More",
          "why": "Learn More signals hesitation and tells visitors nothing about what happens when they click.",
          "fix": "Replace with a specific action: Start Free Trial, Get My Free Audit, or See How It Works."
        }
      ],
      "copy_rewrite": {
        "label": "Hero Headline",
        "original": "Welcome to Our Platform",
        "improved": "Cut Onboarding Time by 60%. No Engineering Changes Required."
      }
    }
  ],
  "overall_issues": [
    {
      "severity": "high",
      "title": "No social proof visible above the fold",
      "description": "Cold visitors see zero trust signals in the first viewport. This is the biggest conversion killer for paid traffic.",
      "fix": "Add a trusted-by logo row or review count directly below the hero CTA."
    },
    {
      "severity": "high",
      "title": "Value proposition is unclear",
      "description": "After reading the page a visitor still cannot articulate what the product does or who it is for.",
      "fix": "Add a one-sentence value prop: We help [audience] achieve [outcome] without [obstacle]."
    }
  ],
  "copy": {
    "headline": {
      "original": "Welcome to Our Platform",
      "improved": "Cut Onboarding Time by 60%. No Engineering Changes Required."
    },
    "subheadline": {
      "original": "We help businesses achieve their goals",
      "improved": "Join 2,000 SaaS teams who reduced churn by 40% in 90 days."
    },
    "cta": {
      "original": "Learn More",
      "improved": "Start Free — No Credit Card Required"
    },
    "benefits": {
      "original": "Fast, powerful, easy to use",
      "improved": "Ship in hours not weeks. Reduce support tickets by 35%. Works with any stack in under 10 minutes."
    }
  },
  "recommendations": [
    {
      "icon": "zap",
      "title": "Rewrite every CTA on the page",
      "description": "Every Learn More or Get Started should become specific action-outcome copy tied to your value prop.",
      "impact": "high"
    },
    {
      "icon": "shield",
      "title": "Add social proof in the first viewport",
      "description": "Place customer logos or a review score directly below the hero CTA. Cold traffic needs trust before clicking.",
      "impact": "high"
    },
    {
      "icon": "target",
      "title": "Add a clear one-sentence value proposition",
      "description": "Visitors cannot articulate what you do. Add a who-what-outcome sentence below your headline.",
      "impact": "high"
    },
    {
      "icon": "users",
      "title": "Replace generic testimonials with specific ones",
      "description": "Quotes without names, companies, or results do not build trust. Add full attribution and quantified outcomes.",
      "impact": "medium"
    },
    {
      "icon": "eye",
      "title": "Reduce hero section text",
      "description": "Cut to one headline, one subheadline under 20 words, and one CTA. Remove all competing messages.",
      "impact": "medium"
    },
    {
      "icon": "trending",
      "title": "Add friction reducers below every CTA",
      "description": "Add micro-copy below each button: No credit card required, Cancel anytime. This lifts clicks by 10-25%.",
      "impact": "medium"
    }
  ],
  "layout": [
    {
      "title": "Move social proof to section 2",
      "description": "Hero then immediately a trust bar with logos or review count. Highest-impact structural change."
    },
    {
      "title": "Place a CTA after every 2 sections",
      "description": "Do not make visitors scroll back to the top to convert. Add contextual CTAs after features and testimonials."
    },
    {
      "title": "Left-align all body copy",
      "description": "Centre-aligned body text beyond 2 lines is harder to read. Left-align paragraphs and feature descriptions."
    },
    {
      "title": "Reduce navigation to 3-4 items",
      "description": "Too many nav links dilute attention. Make the primary CTA the only visually prominent nav element."
    },
    {
      "title": "Add a sticky CTA bar on mobile",
      "description": "Pin your primary CTA to the bottom on mobile. A sticky bar lifts mobile conversion by 20-40%."
    }
  ]
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: isCustom ? 600 : 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Anthropic API error ${res.status}: ${errText.slice(0, 400)}` },
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
            headline: { original: copyText.slice(0, 100), improved: text.trim() },
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
    console.error('[audit]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
