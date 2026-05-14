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

    const hasRealContent = pageContent && pageContent.length > 200 && !pageContent.startsWith('URL:') && !pageContent.startsWith('Website:')

    const prompt = isCustom
      ? `You are a CRO copywriter. Rewrite this copy to be outcome-focused for ${url}. Return ONLY the rewritten copy:\n\n${copyText}`
      : `You are a senior CRO strategist. Audit this website: ${url}

${hasRealContent ? `PAGE CONTENT:\n---\n${pageContent!.slice(0, 3000)}\n---\n` : `Analyze based on your knowledge of this website and its industry.`}

Return ONLY a raw JSON object. No markdown. No code fences. No explanation.

{"scores":{"conversion":52,"ux":68,"cta":41,"trust":58,"mobile":65},"score_notes":{"conversion":"Weak value prop above fold","ux":"Decent layout needs hierarchy","cta":"Generic CTAs throughout","trust":"Social proof below fold","mobile":"CTA not sticky on mobile"},"sections":[{"name":"Hero section","score":48,"what_we_found":"Opening section with main headline and primary CTA. Copy focuses on features rather than outcomes for the visitor.","issues":[{"severity":"high","what":"Headline is feature-focused not outcome-focused","why":"Visitors need to see what they gain in 3 seconds or they bounce","fix":"Rewrite to lead with the specific outcome: what changes in the visitor's life after using this?"},{"severity":"high","what":"CTA copy is generic","why":"Generic CTAs like Get Started or Learn More reduce click-through by 20-30%","fix":"Replace with outcome-specific copy tied to the headline promise"}],"copy_rewrite":{"label":"Hero headline","original":"The platform built for modern teams","improved":"Ship Projects 40% Faster. Your Team Will Actually Use This."}},{"name":"Features section","score":55,"what_we_found":"Grid of product features with icons and short descriptions. Currently written as capabilities rather than benefits.","issues":[{"severity":"medium","what":"Features listed not benefits communicated","why":"Visitors buy outcomes not features. Feature lists create cognitive load.","fix":"Rewrite each feature as a benefit: instead of Real-time sync say Always in sync — no more stale data slowing your team"},{"severity":"medium","what":"No social proof alongside features","why":"Claims without evidence are less persuasive","fix":"Add a short customer quote next to your most important feature"}],"copy_rewrite":{"label":"Feature description","original":"Real-time collaboration for your team","improved":"Your whole team always on the same page — no more version conflicts or lost work"}},{"name":"Social proof section","score":60,"what_we_found":"Testimonials or logos section. Trust signals present but may lack specificity.","issues":[{"severity":"medium","what":"Testimonials lack specific results","why":"Vague praise does not convert. Specific results do.","fix":"Rewrite testimonials to include specific metrics: reduced churn by 30%, saved 5 hours per week"},{"severity":"low","what":"Logo bar without context","why":"Logos alone do not explain why those companies chose you","fix":"Add a one-line stat: Trusted by 500+ teams at these companies"}],"copy_rewrite":{"label":"Testimonial","original":"Great product, highly recommend it","improved":"We cut our onboarding time from 2 weeks to 3 days. Worth every penny. — Sarah K, Head of Product at Acme"}},{"name":"Pricing or CTA section","score":45,"what_we_found":"Conversion section near the bottom. Likely missing friction reducers and risk reversers.","issues":[{"severity":"high","what":"No friction reducers below the CTA","why":"Visitors hesitate when they do not know the commitment. Micro-copy removes this.","fix":"Add below every CTA: No credit card required · Cancel anytime · Free for 14 days"},{"severity":"medium","what":"Single CTA option only","why":"Visitors not ready to buy have no alternative path","fix":"Add a secondary lower-commitment CTA: Watch a 2-min demo or See how it works"}],"copy_rewrite":{"label":"Primary CTA","original":"Get started","improved":"Start Free — No Credit Card Required"}}],"overall_issues":[{"severity":"high","title":"No social proof in the first viewport","description":"Cold visitors see zero trust signals before they must decide whether to scroll. This is the single biggest conversion killer.","fix":"Move a customer logo row or review count directly below the hero CTA."},{"severity":"high","title":"Value proposition is not immediately clear","description":"A first-time visitor cannot articulate exactly what the product does and for whom after 5 seconds.","fix":"Add a one-sentence value prop: We help [specific audience] achieve [specific outcome] without [main obstacle]."},{"severity":"medium","title":"Missing risk reverser near primary CTA","description":"Every CTA needs micro-copy that removes the fear of commitment.","fix":"Add: No credit card required · Cancel anytime · Free for 14 days below every primary CTA."}],"copy":{"headline":{"original":"The platform built for modern teams","improved":"Ship Projects 40% Faster. Your Whole Team Will Actually Use This."},"subheadline":{"original":"Everything your team needs in one place","improved":"Join 3,000 teams who cut project delivery time in half without changing how they work."},"cta":{"original":"Get started","improved":"Start Free — No Credit Card Required"},"benefits":{"original":"Collaborate, organize, and ship faster","improved":"Ship in days not weeks. Everyone always in sync. Zero onboarding time for new hires."}},"recommendations":[{"icon":"zap","title":"Rewrite every CTA with outcome copy","description":"Replace all generic CTAs with specific action-outcome phrases tied to your value prop. Highest ROI change you can make today.","impact":"high"},{"icon":"shield","title":"Add social proof in the first viewport","description":"Place customer logos or a review aggregate score directly below the hero CTA. Trust before the scroll is critical for cold traffic.","impact":"high"},{"icon":"target","title":"Add a clear value proposition sentence","description":"One sentence below your headline: We help X achieve Y without Z. Visitors need this to self-qualify instantly.","impact":"high"},{"icon":"users","title":"Make testimonials specific and quantified","description":"Replace vague praise with quotes that include full name, company, role, and a specific measurable result.","impact":"medium"},{"icon":"eye","title":"Simplify the hero to one message","description":"Remove competing messages from the hero. One headline, one subheadline under 20 words, one CTA.","impact":"medium"},{"icon":"trending","title":"Add friction reducers below every CTA","description":"No credit card required, Cancel anytime, Free for 14 days. These three phrases lift CTA clicks by 10-25%.","impact":"medium"}],"layout":[{"title":"Move social proof immediately after hero","description":"The highest-impact structural change: logo bar or review count right after the hero section, before features."},{"title":"Add a contextual CTA after every 2 sections","description":"Do not make visitors scroll back to convert. Place a CTA button after features and after testimonials."},{"title":"Left-align all body copy","description":"Centre-aligned paragraphs beyond 2 lines are harder to read. Left-align all body text while keeping headlines centred."},{"title":"Reduce navigation to 3-4 items maximum","description":"Every extra nav link competes with your conversion goal. Make the primary CTA the only visually prominent nav element."},{"title":"Add a sticky CTA bar on mobile","description":"Pin the primary CTA to the bottom of the screen on mobile. Mobile visitors scroll past inline CTAs constantly."}]}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: isCustom ? 300 : 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Anthropic API error ${res.status}: ${errText.slice(0, 300)}` },
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
