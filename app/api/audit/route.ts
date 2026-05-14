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
    const content = (pageContent || '').slice(0, 1500)

    const prompt = isCustom
      ? `Rewrite this website copy to be conversion-focused for ${url}. Return ONLY the rewritten copy, nothing else:\n\n${copyText}`
      : `You are a CRO expert. Audit: ${url}\n\nPage content:\n${content}\n\nReturn ONLY this exact JSON structure with no markdown, no code fences, nothing else before or after:\n\n{"scores":{"conversion":54,"ux":68,"cta":42,"trust":58,"mobile":65},"score_notes":{"conversion":"Weak value prop above fold","ux":"Decent layout needs work","cta":"Generic CTAs throughout","trust":"No social proof visible","mobile":"CTA not optimized"},"sections":[{"name":"Hero Section","score":48,"what_we_found":"Opening section with headline and CTA. Copy is feature-focused rather than outcome-focused.","issues":[{"severity":"high","what":"Headline lacks outcome clarity","why":"Visitors cannot understand the value in 3 seconds, causing high bounce rates","fix":"Rewrite headline to lead with specific outcome: what changes for the visitor after using this product"},{"severity":"high","what":"CTA is generic and weak","why":"Generic CTAs reduce click-through rates by 20-30% compared to specific action copy","fix":"Replace with outcome-specific CTA tied to the headline promise"}],"copy_rewrite":{"label":"Hero headline","original":"The platform built for modern teams","improved":"Ship Projects 40% Faster — Your Team Will Actually Use This"}},{"name":"Features Section","score":55,"what_we_found":"Grid of product features with descriptions. Written as capabilities rather than customer benefits.","issues":[{"severity":"medium","what":"Features listed not benefits communicated","why":"Visitors buy outcomes not features. Feature lists create cognitive load and slow decisions.","fix":"Rewrite each feature as a benefit using: Feature so you can Outcome format"},{"severity":"low","what":"No social proof alongside features","why":"Claims without evidence are less convincing to skeptical visitors","fix":"Add a short customer quote next to your most important feature"}],"copy_rewrite":{"label":"Feature description","original":"Real-time collaboration tools","improved":"Your whole team always in sync — no more version conflicts or lost work"}},{"name":"Social Proof Section","score":62,"what_we_found":"Testimonials or logo section present. May lack specificity needed to build real trust.","issues":[{"severity":"medium","what":"Testimonials lack specific measurable results","why":"Vague praise does not convert. Visitors need to see specific outcomes others achieved.","fix":"Add specific metrics to each testimonial: reduced churn by 30%, saved 5 hours per week"},{"severity":"low","what":"Logo bar lacks context","why":"Logos alone do not explain why companies chose you","fix":"Add a stat: Trusted by 500+ teams at these companies"}],"copy_rewrite":{"label":"Testimonial","original":"Great product, highly recommend","improved":"We cut onboarding from 2 weeks to 3 days. Best investment we made this year — Sarah K, Head of Product"}},{"name":"Pricing or CTA Section","score":44,"what_we_found":"Conversion section near bottom. Missing friction reducers that remove hesitation before clicking.","issues":[{"severity":"high","what":"No friction reducers below the CTA","why":"Visitors hesitate when they do not know the commitment level. Micro-copy removes this barrier.","fix":"Add below every CTA: No credit card required · Cancel anytime · Free for 14 days"},{"severity":"medium","what":"Only one CTA option","why":"Visitors not ready to buy have no alternative path, so they leave entirely","fix":"Add secondary lower-commitment CTA: Watch a 2-min demo or See how it works"}],"copy_rewrite":{"label":"Primary CTA","original":"Get started","improved":"Start Free — No Credit Card Required"}}],"overall_issues":[{"severity":"high","title":"No social proof in the first viewport","description":"Cold visitors see zero trust signals before deciding whether to engage. This is the single biggest conversion killer for paid and cold traffic.","fix":"Move a customer logo row or review count directly below the hero CTA, visible without scrolling."},{"severity":"high","title":"Value proposition unclear after 5 seconds","description":"A first-time visitor cannot clearly articulate what the product does and who it is for after reading the page.","fix":"Add a one-sentence value prop below headline: We help [specific audience] achieve [outcome] without [obstacle]."},{"severity":"medium","title":"Missing risk reversers near CTAs","description":"Every CTA needs micro-copy that removes the fear of commitment and reduces hesitation.","fix":"Add below every primary CTA: No credit card required · Cancel anytime · Free for 14 days."}],"copy":{"headline":{"original":"The platform built for modern teams","improved":"Ship Projects 40% Faster — Your Team Will Actually Use This"},"subheadline":{"original":"Everything your team needs in one place","improved":"Join 3,000 teams who cut project delivery time in half without changing how they work"},"cta":{"original":"Get started","improved":"Start Free — No Credit Card Required"},"benefits":{"original":"Collaborate organize and ship faster","improved":"Ship in days not weeks. Everyone always in sync. Zero onboarding time for new hires."}},"recommendations":[{"icon":"zap","title":"Rewrite every CTA with outcome copy","description":"Replace all generic CTAs with specific action-outcome phrases. This is the highest ROI change you can make today.","impact":"high"},{"icon":"shield","title":"Add social proof in the first viewport","description":"Place customer logos or review score below hero CTA. Trust before the scroll is critical for cold traffic.","impact":"high"},{"icon":"target","title":"Add a clear value proposition","description":"One sentence: We help X achieve Y without Z. Visitors need this to self-qualify instantly.","impact":"high"},{"icon":"users","title":"Make testimonials specific","description":"Replace vague praise with quotes that include name, company, role, and a specific measurable result.","impact":"medium"},{"icon":"eye","title":"Simplify the hero to one message","description":"One headline, one subheadline under 20 words, one CTA. Remove all competing messages.","impact":"medium"},{"icon":"trending","title":"Add friction reducers below CTAs","description":"No credit card required, Cancel anytime, Free for 14 days. These lift CTA clicks by 10-25%.","impact":"medium"}],"layout":[{"title":"Move social proof immediately after hero","description":"Logo bar or review count right after hero, before features. Highest-impact structural change."},{"title":"Add a CTA after every 2 sections","description":"Do not make visitors scroll back to convert. Place buttons after features and after testimonials."},{"title":"Left-align all body copy","description":"Centre-aligned paragraphs beyond 2 lines are harder to read. Left-align all body text."},{"title":"Reduce navigation to 3-4 items","description":"Every extra nav link competes with your conversion goal. One prominent CTA in the nav only."},{"title":"Add a sticky CTA bar on mobile","description":"Pin the primary CTA to the bottom on mobile. Lifts mobile conversion by 20-40%."}]}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: isCustom ? 200 : 1500,
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
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
