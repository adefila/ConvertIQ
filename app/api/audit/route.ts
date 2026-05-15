import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string; pageContent?: string; fetchMethod?: string }
    const { url, pageContent, fetchMethod } = body

    if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    const isCustom = fetchMethod === 'custom' &&
      typeof pageContent === 'string' &&
      pageContent.startsWith('CUSTOM_REWRITE:')
    const copyText = isCustom ? pageContent.replace('CUSTOM_REWRITE:\n', '') : ''
    const hasContent = !isCustom && pageContent && pageContent.length > 300 && !pageContent.startsWith('Website:')
    const content = hasContent ? pageContent!.slice(0, 5000) : ''

    const prompt = isCustom
      ? `Rewrite this copy to be outcome-focused for ${url}. Return ONLY the rewritten copy:\n\n${copyText}`
      : `You are a world-class CRO strategist. Audit: ${url}

${content ? `PAGE CONTENT:\n---\n${content}\n---` : `Analyze based on your knowledge of this website and industry.`}

Return ONLY a valid JSON object. No markdown. No code fences. Start with { end with }.

{"scores":{"conversion":52,"ux":65,"cta":44,"trust":55,"mobile":62},"score_notes":{"conversion":"Generic headline lacks urgency","ux":"Too many nav options","cta":"Weak CTA copy throughout","trust":"No social proof above fold","mobile":"CTA not sticky"},"sections":[{"name":"Hero Section","score":46,"what_we_found":"Opening section with main headline and CTA. Copy is feature-focused rather than outcome-focused.","issues":[{"severity":"high","what":"Headline lacks outcome clarity","why":"Visitors need to see what changes for them in 3 seconds or they bounce","fix":"Lead with specific outcome: Save 10 Hours a Week on Admin - Starting Today"},{"severity":"high","what":"Primary CTA is generic","why":"Generic CTAs reduce clicks by 20-30%","fix":"Replace with: Start Free - No Credit Card Required"}],"copy_rewrite":{"label":"Hero Headline","original":"The platform for modern teams","improved":"Save 10 Hours a Week on Admin. Your Team Will Love It."}},{"name":"Features Section","score":54,"what_we_found":"Grid of product features. Written as capabilities not customer benefits.","issues":[{"severity":"medium","what":"Features not benefits","why":"Visitors buy outcomes not features","fix":"Rewrite each as benefit: Always in sync - no more chasing updates"},{"severity":"low","what":"No social proof alongside features","why":"Claims without evidence are less persuasive","fix":"Add one customer quote next to your main feature"}],"copy_rewrite":{"label":"Feature description","original":"Real-time collaboration","improved":"Your whole team always on the same page. Zero conflicts."}},{"name":"Social Proof","score":60,"what_we_found":"Testimonials or logos present but lack specific metrics.","issues":[{"severity":"medium","what":"Testimonials lack specific results","why":"Vague praise does not convert","fix":"Add metrics: We cut onboarding from 3 weeks to 4 days"},{"severity":"low","what":"Logo bar has no supporting stat","why":"Logos alone do not explain the choice","fix":"Add: Trusted by 1000 plus teams"}],"copy_rewrite":{"label":"Testimonial","original":"Great product, highly recommend","improved":"We cut onboarding from 3 weeks to 4 days. Paid for itself month one."}},{"name":"Pricing Section","score":44,"what_we_found":"Pricing section near bottom. Missing friction reducers near CTAs.","issues":[{"severity":"high","what":"No friction reducers below CTAs","why":"Visitors hesitate at pricing without reassurance","fix":"Add: No credit card required. Cancel anytime. 14-day free trial."},{"severity":"medium","what":"Feature lists not outcome statements","why":"At decision point visitors need to see value","fix":"Replace bullets with outcomes in highest tier"}],"copy_rewrite":{"label":"Pricing CTA","original":"Get started","improved":"Start Free Trial - No Credit Card Required"}},{"name":"Footer CTA","score":42,"what_we_found":"Closing CTA at bottom. Last chance to convert.","issues":[{"severity":"high","what":"CTA repeats hero message","why":"Bottom visitors need urgency not repetition","fix":"Add urgency: Join 10000 teams today"},{"severity":"medium","what":"No secondary path","why":"Not all visitors are ready to buy","fix":"Add: Watch a 3-minute demo"}],"copy_rewrite":{"label":"Footer CTA","original":"Ready to get started?","improved":"Join 10000 teams saving 10 hours a week. Start free today."}}],"overall_issues":[{"severity":"high","title":"No social proof above fold","description":"Cold visitors see zero trust signals in the first viewport.","fix":"Move logo row or review count below hero CTA."},{"severity":"high","title":"Value prop unclear after 5 seconds","description":"Visitors cannot articulate what the product does or who it is for.","fix":"Add: We help [audience] achieve [outcome] without [obstacle] below headline."},{"severity":"medium","title":"Missing risk reversers near CTAs","description":"Every CTA lacks micro-copy that removes commitment fear.","fix":"Add: No credit card required. Cancel anytime. Below every CTA."}],"copy":{"headline":{"original":"The platform for modern teams","improved":"Save 10 Hours a Week on Admin. Your Team Will Use This."},"subheadline":{"original":"Everything your team needs","improved":"Join 10000 teams who cut admin time in half without changing workflow."},"cta":{"original":"Get started","improved":"Start Free - No Credit Card Required"},"benefits":{"original":"Fast, powerful, easy","improved":"Ship in days not weeks. Everyone in sync. New hires productive from day one."}},"recommendations":[{"icon":"zap","title":"Rewrite every CTA with outcome copy","description":"Replace all generic CTAs with specific action-outcome phrases. Highest ROI change available.","impact":"high"},{"icon":"shield","title":"Add social proof in first viewport","description":"Place logos or review aggregate below hero CTA. Trust before scroll is critical.","impact":"high"},{"icon":"target","title":"Add clear value proposition","description":"One sentence: We help X achieve Y without Z. Place below headline immediately.","impact":"high"},{"icon":"users","title":"Make testimonials specific","description":"Replace vague praise with name, company, role, and specific measurable result.","impact":"medium"},{"icon":"eye","title":"Simplify hero to one message","description":"One headline, one subheadline under 20 words, one CTA only.","impact":"medium"},{"icon":"trending","title":"Add friction reducers below CTAs","description":"No credit card required. Cancel anytime. Lifts clicks by 10-25%.","impact":"medium"}],"layout":[{"title":"Social proof immediately after hero","description":"Logo bar right after hero before features. Highest impact structural change."},{"title":"CTA after every two sections","description":"Do not make visitors scroll back to convert."},{"title":"Left-align all body copy","description":"Centre-aligned paragraphs beyond two lines are harder to read."},{"title":"Reduce nav to three or four items","description":"Every extra link competes with conversion goal."},{"title":"Sticky CTA bar on mobile","description":"Pin CTA to bottom on mobile. Lifts conversion by 20-40%."}]}`

    // NON-STREAMING — simpler, no parsing issues
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: isCustom ? 400 : 6000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const e = await res.text()
      return NextResponse.json({ error: `API error ${res.status}: ${e.slice(0, 200)}` }, { status: 500 })
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

    // Clean and parse — no streaming means no double-escaped sequences
    let clean = text
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    const s = clean.indexOf('{')
    const e2 = clean.lastIndexOf('}')
    if (s !== -1 && e2 !== -1) clean = clean.slice(s, e2 + 1)

    const result = JSON.parse(clean)
    return NextResponse.json({ ok: true, result })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
