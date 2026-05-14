import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 10

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
      ? `You are a world-class CRO copywriter. Rewrite this website copy to be outcome-focused and conversion-optimized for ${url}. Return ONLY the rewritten copy, nothing else:\n\n${copyText}`
      : `You are a senior CRO strategist. Audit this website: ${url}

PAGE CONTENT:
---
${(pageContent || 'No content. Analyze based on URL and domain knowledge.').slice(0, 4000)}
---

Read top to bottom like a human. Identify 4-6 sections. Return ONLY raw JSON, no markdown, no code fences.

{"scores":{"conversion":54,"ux":71,"cta":43,"trust":61,"mobile":68},"score_notes":{"conversion":"Vague headline","ux":"Decent structure","cta":"Weak CTAs","trust":"No social proof","mobile":"CTA below fold"},"sections":[{"name":"Hero Section","score":45,"what_we_found":"The headline says Welcome to Our Platform. CTA says Learn More.","issues":[{"severity":"high","what":"Headline has no outcome clarity","why":"Visitors cannot understand the value in 3 seconds","fix":"Lead with a specific outcome: Cut Onboarding Time by 60% — No Engineering Changes"},{"severity":"high","what":"CTA says Learn More","why":"Weakest possible CTA — signals hesitation","fix":"Replace with: Start Free Trial or Get My Free Audit"}],"copy_rewrite":{"label":"Hero Headline","original":"Welcome to Our Platform","improved":"Cut Onboarding Time by 60%. No Engineering Changes Required."}}],"overall_issues":[{"severity":"high","title":"No social proof above fold","description":"Cold visitors see zero trust signals in the first viewport.","fix":"Add a logo bar or review count directly below the hero CTA."},{"severity":"high","title":"Value proposition unclear","description":"Visitors cannot articulate what you do after 5 seconds.","fix":"Add: We help [audience] achieve [outcome] without [obstacle]."}],"copy":{"headline":{"original":"Welcome to Our Platform","improved":"Cut Onboarding Time by 60%. No Engineering Changes Required."},"subheadline":{"original":"We help businesses achieve their goals","improved":"Join 2,000 teams who reduced churn by 40% in 90 days."},"cta":{"original":"Learn More","improved":"Start Free — No Credit Card Required"},"benefits":{"original":"Fast, powerful, easy","improved":"Ship in hours not weeks. Reduce support tickets by 35%. Works with any stack."}},"recommendations":[{"icon":"zap","title":"Rewrite every CTA on the page","description":"Replace all Learn More with specific action-outcome copy tied to your value prop.","impact":"high"},{"icon":"shield","title":"Add social proof above the fold","description":"Place logos or review score below the hero CTA. Cold traffic needs trust before clicking.","impact":"high"},{"icon":"target","title":"Clarify your value proposition","description":"Add a who-what-outcome sentence below your headline immediately.","impact":"high"},{"icon":"users","title":"Add specific testimonials","description":"Replace generic quotes with full names, company, and quantified results.","impact":"medium"},{"icon":"eye","title":"Simplify the hero section","description":"One headline, one subheadline under 20 words, one CTA. Remove competing messages.","impact":"medium"},{"icon":"trending","title":"Add friction reducers below CTAs","description":"Add: No credit card required, Cancel anytime. Lifts clicks by 10-25%.","impact":"medium"}],"layout":[{"title":"Move social proof to section 2","description":"Hero then logo bar immediately. Highest-impact structural change."},{"title":"Add CTA after every 2 sections","description":"Don't make visitors scroll back to convert. Add contextual CTAs throughout."},{"title":"Left-align all body copy","description":"Centre-aligned body text beyond 2 lines is harder to read."},{"title":"Reduce navigation to 3-4 items","description":"Fewer nav links means more focus on the conversion goal."},{"title":"Add sticky mobile CTA bar","description":"Pin CTA to bottom on mobile. Lifts mobile conversion by 20-40%."}]}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: isCustom ? 300 : 3000,
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
