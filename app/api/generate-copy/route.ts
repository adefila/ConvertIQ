import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      projectName?: string
      industry?: string
      targetAudience?: string
      mainOffer?: string
      keyBenefits?: string
      tone?: string
      primaryKeyword?: string
      secondaryKeywords?: string
    }

    const {
      projectName = '',
      industry = '',
      targetAudience = '',
      mainOffer = '',
      keyBenefits = '',
      tone = 'professional',
      primaryKeyword = '',
      secondaryKeywords = '',
    } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    const systemPrompt = `You are a world-class conversion copywriter and SEO strategist. You write website copy that converts visitors into customers. You ONLY respond with valid JSON. Never write any text before or after the JSON.`

    const userPrompt = `Write complete, conversion-optimised website copy for:

Project: ${projectName}
Industry: ${industry}
Target Audience: ${targetAudience}
Main Offer: ${mainOffer}
Key Benefits: ${keyBenefits}
Tone: ${tone}
Primary SEO Keyword: ${primaryKeyword}
Secondary Keywords: ${secondaryKeywords}

Write word-for-word copy for every section of a high-converting landing page. Include the primary keyword naturally in headline, meta description, and H2s. Include secondary keywords in body copy.

Return ONLY compact JSON (no whitespace between fields):

{"meta":{"title":"SEO title under 60 chars with primary keyword","description":"Meta description under 160 chars with primary keyword and clear value prop"},"sections":[{"name":"Navigation","copy":"Logo name | Nav links | Primary CTA button text"},{"name":"Hero","headline":"H1 with primary keyword","subheadline":"H2 clarifying the value prop with secondary keyword","cta_primary":"Primary CTA button","cta_secondary":"Secondary softer CTA","seo_note":"SEO note about this section"},{"name":"Social Proof Bar","copy":"Short trust line. List of 4-5 logo names or stats"},{"name":"Problem Section","headline":"H2 addressing the pain","body":"2-3 sentences describing the exact problem the audience has. Be specific."},{"name":"Solution Section","headline":"H2 introducing the solution with secondary keyword","body":"2-3 sentences on how the product solves the problem. Outcome-focused."},{"name":"Features & Benefits","headline":"H2 for this section","items":[{"feature":"Feature name","benefit":"Outcome the customer gets","copy":"One sentence copy for this feature"}]},{"name":"How It Works","headline":"H2 with secondary keyword","steps":[{"step":"Step name","copy":"One sentence description"}]},{"name":"Testimonials","headline":"H2 for social proof section","items":[{"quote":"Full realistic testimonial quote with specific result","name":"First Name L.","role":"Job Title, Company Name"}]},{"name":"Pricing","headline":"H2 for pricing","subheadline":"Supporting copy reducing hesitation","tiers":[{"name":"Tier name","price":"Price","description":"Who this is for","cta":"CTA text","features":["feature 1","feature 2","feature 3"]}],"guarantee":"Risk reversal copy"},{"name":"FAQ","headline":"H2 for FAQ with secondary keyword","items":[{"question":"Common objection as question","answer":"Reassuring answer that removes the objection"}]},{"name":"Final CTA","headline":"H2 with urgency or outcome","subheadline":"Supporting copy","cta":"Final CTA button","seo_note":"SEO note"},{"name":"Footer","copy":"Short brand tagline | Key links | Legal copy template"}]}

Rules: Write real, specific copy. No placeholders. Use the actual project name, audience, and offer. Minimum 3 features, 3 steps, 3 testimonials, 2 pricing tiers, 5 FAQ items.`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 6000,
        system: systemPrompt,
        stream: true,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const e = await anthropicRes.text()
      return NextResponse.json({ error: `API error ${anthropicRes.status}: ${e.slice(0, 200)}` }, { status: 500 })
    }

    const reader = anthropicRes.body!.getReader()
    const decoder = new TextDecoder()
    const textParts: string[] = []
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data || data === '[DONE]') continue
        try {
          const evt = JSON.parse(data) as { type: string; delta?: { type: string; text: string } }
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
            textParts.push(evt.delta.text)
          }
        } catch { /* skip */ }
      }
    }

    const fullText = textParts.join('')
    let clean = fullText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const s = clean.indexOf('{')
    const e = clean.lastIndexOf('}')
    if (s !== -1 && e !== -1) clean = clean.slice(s, e + 1)

    try {
      const result = JSON.parse(clean)
      return NextResponse.json({ ok: true, result })
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      return NextResponse.json({ error: `Parse failed: ${msg}` }, { status: 500 })
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
