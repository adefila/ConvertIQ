import { NextRequest } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string; pageContent?: string; fetchMethod?: string }
    const { url, pageContent, fetchMethod } = body

    if (!url) {
      return new Response(JSON.stringify({ error: 'No URL provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isCustom = fetchMethod === 'custom' &&
      typeof pageContent === 'string' &&
      pageContent.startsWith('CUSTOM_REWRITE:')
    const copyText = isCustom ? pageContent.replace('CUSTOM_REWRITE:\n', '') : ''
    const hasContent = !isCustom && pageContent && pageContent.length > 300 && !pageContent.startsWith('Website:')
    const content = hasContent ? pageContent!.slice(0, 5000) : ''

    const prompt = isCustom
      ? `Rewrite this copy to be outcome-focused for ${url}. Return ONLY the rewritten copy:\n\n${copyText}`
      : `You are a world-class CRO strategist. Audit: ${url}

${content ? `PAGE CONTENT:\n---\n${content}\n---\nQuote actual copy in your analysis.` : `Analyze based on your knowledge of this website and its industry.`}

Return ONLY a valid JSON object. No markdown. No code fences. Start with { and end with }.

{"scores":{"conversion":52,"ux":65,"cta":44,"trust":55,"mobile":62},"score_notes":{"conversion":"Generic headline lacks urgency","ux":"Too many nav options","cta":"Weak CTA copy throughout","trust":"No social proof above fold","mobile":"CTA not sticky on mobile"},"sections":[{"name":"Hero Section","score":46,"what_we_found":"Opening section with main headline and CTA. Copy is feature-focused rather than outcome-focused.","issues":[{"severity":"high","what":"Headline is feature-focused not outcome-focused","why":"Visitors need to see what changes in their life within 3 seconds or they bounce","fix":"Rewrite to lead with specific outcome. Example: Save 10 Hours a Week on Admin Starting Today"},{"severity":"high","what":"Primary CTA is generic","why":"Generic CTAs reduce clicks by 20-30% vs specific action copy","fix":"Replace with: Start Free - No Credit Card Required"}],"copy_rewrite":{"label":"Hero Headline","original":"The all-in-one platform for your business","improved":"Save 10 Hours a Week on Admin. Your Team Will Love It."}},{"name":"Features Section","score":54,"what_we_found":"Grid of product features with icons and descriptions. Written as capabilities rather than customer benefits.","issues":[{"severity":"medium","what":"Features listed not benefits communicated","why":"Visitors buy outcomes not features. Feature lists create cognitive load.","fix":"Rewrite each feature as a benefit statement leading with the outcome"},{"severity":"low","what":"No social proof alongside features","why":"Feature claims without evidence are less persuasive","fix":"Add one customer quote next to your most important feature"}],"copy_rewrite":{"label":"Feature description","original":"Real-time collaboration and sync","improved":"Your whole team always on the same page. Zero version conflicts. Zero lost work."}},{"name":"Social Proof Section","score":60,"what_we_found":"Testimonials or customer logos present. Builds some trust but testimonials lack specific metrics.","issues":[{"severity":"medium","what":"Testimonials lack specific measurable outcomes","why":"Vague praise does not convert. Specific results do.","fix":"Rewrite testimonials to include specific metrics"},{"severity":"low","what":"Logo bar has no supporting stat","why":"Logos alone do not explain why companies chose you","fix":"Add: Trusted by 1000 plus teams at these companies"}],"copy_rewrite":{"label":"Customer testimonial","original":"Great product our team loves it","improved":"We cut onboarding from 3 weeks to 4 days. Paid for itself in month one."}},{"name":"Pricing Section","score":44,"what_we_found":"Pricing or conversion section near the bottom. Missing friction reducers near the CTAs.","issues":[{"severity":"high","what":"No friction reducers below pricing CTAs","why":"Visitors hesitate at pricing. Micro-copy removes the fear of commitment.","fix":"Add below every CTA: No credit card required. Cancel anytime. 14-day free trial."},{"severity":"medium","what":"Feature lists in pricing instead of outcomes","why":"At the decision point visitors need to see value not features","fix":"Replace bullets with outcome statements in highest tier"}],"copy_rewrite":{"label":"Pricing CTA","original":"Get started","improved":"Start Free Trial. No Credit Card Required."}},{"name":"Footer CTA Section","score":42,"what_we_found":"Closing CTA at the bottom of the page. Last chance to convert visitors who scrolled the full page.","issues":[{"severity":"high","what":"Closing CTA repeats the hero message","why":"Bottom-of-page visitors need urgency or a guarantee not repetition","fix":"Add urgency: Join 10000 teams or 14-day money-back guarantee"},{"severity":"medium","what":"No secondary conversion path","why":"Not all visitors are ready to buy","fix":"Add: Watch a 3-minute demo or Read customer stories"}],"copy_rewrite":{"label":"Bottom CTA headline","original":"Ready to get started?","improved":"Join 10000 teams already saving 10 hours a week. Start free today."}}],"overall_issues":[{"severity":"high","title":"No social proof visible above the fold","description":"Cold visitors see zero trust signals in the first viewport before deciding whether to engage.","fix":"Move a customer logo row or review count directly below the hero CTA."},{"severity":"high","title":"Value proposition unclear after 5 seconds","description":"A first-time visitor cannot clearly articulate what the product does, who it is for, and what outcome they get.","fix":"Add a one-sentence value prop below the headline."},{"severity":"medium","title":"Missing risk reversers near every CTA","description":"Every CTA on the page lacks micro-copy that removes the fear of commitment.","fix":"Add: No credit card required. Cancel anytime. Free for 14 days. Below every CTA."}],"copy":{"headline":{"original":"The all-in-one platform for your business","improved":"Save 10 Hours a Week on Admin. Your Team Will Actually Use This."},"subheadline":{"original":"Everything your team needs to collaborate and grow","improved":"Join 10000 teams who cut admin time in half without changing how they work."},"cta":{"original":"Get started","improved":"Start Free. No Credit Card Required."},"benefits":{"original":"Collaborate organize and grow faster","improved":"Ship in days not weeks. Everyone always in sync. New hires productive from day one."}},"recommendations":[{"icon":"zap","title":"Rewrite every CTA with outcome copy","description":"Replace all generic CTAs with specific action-outcome phrases. Highest ROI change today.","impact":"high"},{"icon":"shield","title":"Add social proof in the first viewport","description":"Place customer logos or a review aggregate directly below the hero CTA.","impact":"high"},{"icon":"target","title":"Add a one-sentence value proposition","description":"Visitors cannot articulate what you do. Add who-what-outcome below the headline.","impact":"high"},{"icon":"users","title":"Make testimonials specific and quantified","description":"Replace vague praise with quotes including name, company, role, and measurable result.","impact":"medium"},{"icon":"eye","title":"Simplify hero to one message","description":"One headline, one subheadline under 20 words, one CTA. Remove every competing element.","impact":"medium"},{"icon":"trending","title":"Add friction reducers below every CTA","description":"No credit card required. Cancel anytime. Free for 14 days. Lifts clicks by 10-25%.","impact":"medium"}],"layout":[{"title":"Move social proof immediately after hero","description":"Logo bar or review count right after the hero before features."},{"title":"Add a CTA after every two sections","description":"Do not make visitors scroll back to convert. Place contextual CTAs throughout."},{"title":"Left-align all body copy","description":"Centre-aligned paragraphs beyond two lines are harder to read."},{"title":"Reduce navigation to three or four items","description":"Every extra nav link competes with your conversion goal."},{"title":"Add a sticky CTA bar on mobile","description":"Pin the primary CTA to the bottom on mobile. Lifts mobile conversion by 20-40%."}]}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: isCustom ? 400 : 6000,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return new Response(
        JSON.stringify({ error: `Anthropic API error ${anthropicRes.status}: ${errText.slice(0, 200)}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Collect streamed response
    const reader = anthropicRes.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data) as {
              type: string
              delta?: { type: string; text: string }
            }
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              fullText += parsed.delta.text
            }
          } catch { /* skip */ }
        }
      }
    }

    if (isCustom) {
      return new Response(JSON.stringify({
        ok: true,
        result: {
          scores: { conversion: 0, ux: 0, cta: 0, trust: 0, mobile: 0 },
          score_notes: { conversion: '', ux: '', cta: '', trust: '', mobile: '' },
          sections: [],
          overall_issues: [],
          copy: {
            headline: { original: copyText.slice(0, 150), improved: fullText.trim() },
            subheadline: { original: '', improved: '' },
            cta: { original: '', improved: '' },
            benefits: { original: '', improved: '' },
          },
          recommendations: [],
          layout: [],
        },
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Step 1: Try parsing raw response first — Claude returns valid formatted JSON
    // DO NOT escape newlines — they are valid outside JSON string values
    const raw = fullText.trim()

    // Try 1: raw text as-is (works most of the time)
    try {
      const result = JSON.parse(raw)
      return new Response(
        JSON.stringify({ ok: true, result }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } catch { /* fall through to repair */ }

    // Try 2: strip markdown fences and try again
    const stripped = raw
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()

    try {
      const result = JSON.parse(stripped)
      return new Response(
        JSON.stringify({ ok: true, result }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } catch { /* fall through */ }

    // Try 3: extract JSON object and try again
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      const extracted = stripped.slice(start, end + 1)
      try {
        const result = JSON.parse(extracted)
        return new Response(
          JSON.stringify({ ok: true, result }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      } catch { /* fall through */ }
    }

    // Try 4: strip invisible unicode chars that are NOT newlines/tabs, then parse
    const cleaned = stripped
      .replace(/[\uFEFF\u200B\u200C\u200D\u2060\u00AD\u200E\u200F\u202A-\u202F\u2066-\u2069]/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u00A0/g, ' ')

    const start2 = cleaned.indexOf('{')
    const end2 = cleaned.lastIndexOf('}')
    if (start2 !== -1 && end2 !== -1) {
      try {
        const result = JSON.parse(cleaned.slice(start2, end2 + 1))
        return new Response(
          JSON.stringify({ ok: true, result }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      } catch { /* fall through */ }
    }

    // All attempts failed — return error
    return new Response(
      JSON.stringify({ error: 'Could not parse audit response. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
