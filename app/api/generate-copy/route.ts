import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const PAGE_PROMPTS: Record<string, string> = {
  Home: `Write a full homepage with: Navigation, Hero, Social Proof Bar, Problem, Solution, Features/Benefits (3+), How It Works (3 steps), Testimonials (3), Pricing (2 tiers), FAQ (5 items), Final CTA, Footer`,
  About: `Write a full About page with: Page Header, Founder/Team Story, Mission & Values, Why We Started, Team Section, Social Proof, CTA to next step`,
  Services: `Write a full Services page with: Page Header, Services Overview, Each Service (name, description, benefits, who it's for), Process/How it works, Pricing summary, FAQ, CTA`,
  Pricing: `Write a full Pricing page with: Page Header, Value Prop, Pricing Tiers (3), Feature comparison, FAQ (5 pricing objections), Guarantee, CTA`,
  Contact: `Write a full Contact page with: Page Header, Intro copy, Form labels and placeholder text, Response time promise, Alternative contact options, FAQ (3 items)`,
  'Case Studies': `Write a full Case Studies page with: Page Header, Results summary stats, 3 detailed case studies (client, challenge, solution, results), Testimonial for each, CTA`,
  Portfolio: `Write a full Portfolio page with: Page Header, Personal brand statement, Work showcase intro, Project descriptions (3-4 with client, role, outcome), Skills/Services section, Testimonials, Contact CTA`,
  Blog: `Write a full Blog/Content page with: Page Header, Category descriptions, Featured post intro, Content pillars, Newsletter signup copy, CTA`,
  'Landing Page': `Write a high-converting landing page with: Hero (no nav), Problem Agitation, Solution reveal, Features/Benefits (3), Social Proof, Pricing/Offer, Guarantee, Final CTA. No distractions — single focused conversion goal`,
}

const SITE_TYPE_CONTEXT: Record<string, string> = {
  portfolio: `This is a PORTFOLIO/PERSONAL BRAND site. The "product" is the person themselves — a designer, developer, consultant, or creative professional. Focus on their unique story, specific skills, past clients, and measurable outcomes of their work. Use first-person voice. Avoid corporate language. Make it feel human, confident, and specific.`,
  saas: `This is a SAAS product. Focus on the software's capabilities, time/money saved, integration with existing workflows, and specific use cases for the target audience.`,
  agency: `This is a MARKETING/CREATIVE AGENCY. Focus on client outcomes, industry expertise, process transparency, and portfolio of results. Agencies sell trust and expertise.`,
  ecommerce: `This is an E-COMMERCE site. Focus on product benefits, social proof, shipping/returns policy, and urgency/scarcity. Make buying feel safe and easy.`,
  service: `This is a SERVICE BUSINESS. Focus on the transformation the client gets, process clarity, credibility signals, and reducing the risk of hiring.`,
}

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
      pageType?: string
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
      pageType = 'Home',
    } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    // Detect site type from industry/offer
    const combined = `${industry} ${mainOffer} ${projectName}`.toLowerCase()
    let siteTypeContext = SITE_TYPE_CONTEXT.service
    if (combined.includes('portfolio') || combined.includes('design') || combined.includes('freelance') || combined.includes('creative') || combined.includes('photographer') || combined.includes('developer')) {
      siteTypeContext = SITE_TYPE_CONTEXT.portfolio
    } else if (combined.includes('saas') || combined.includes('software') || combined.includes('app') || combined.includes('platform') || combined.includes('tool')) {
      siteTypeContext = SITE_TYPE_CONTEXT.saas
    } else if (combined.includes('agency') || combined.includes('marketing') || combined.includes('digital')) {
      siteTypeContext = SITE_TYPE_CONTEXT.agency
    } else if (combined.includes('shop') || combined.includes('store') || combined.includes('product') || combined.includes('ecom')) {
      siteTypeContext = SITE_TYPE_CONTEXT.ecommerce
    }

    const pageInstructions = PAGE_PROMPTS[pageType] ?? PAGE_PROMPTS.Home

    const systemPrompt = `You are a world-class conversion copywriter. You write specific, outcome-focused website copy that converts visitors into customers. You ONLY respond with valid JSON. Never write text before or after the JSON.`

    const userPrompt = `Write complete ${pageType} page copy for:

Brand: ${projectName}
Industry: ${industry}
Target Audience: ${targetAudience}
Main Offer: ${mainOffer}
Key Benefits: ${keyBenefits}
Tone: ${tone}
Primary SEO Keyword: ${primaryKeyword || 'not specified'}
Secondary Keywords: ${secondaryKeywords || 'not specified'}

SITE TYPE CONTEXT: ${siteTypeContext}

PAGE REQUIREMENTS: ${pageInstructions}

SEO RULES:
- Use primary keyword naturally in the H1/headline
- Use secondary keywords in subheadings and body copy
- Write meta title under 60 chars with primary keyword
- Write meta description under 160 chars with primary keyword and clear value prop
- Use semantic heading hierarchy (H1 → H2 → H3)

COPY RULES:
- Write REAL, SPECIFIC copy — no placeholders like [Your Name] or [Insert Benefit]
- Use the actual project name, audience details, and benefits provided
- Every CTA must be outcome-specific (not "Get Started" or "Learn More")
- For portfolio sites: write in first person, be specific about past clients and outcomes
- Keep string values concise — max 30 words each field

Return ONLY compact JSON (no whitespace between fields):

{"meta":{"title":"SEO title","description":"meta description"},"siteType":"Portfolio|SaaS|Agency|Ecommerce|Service","conversionTips":["tip 1","tip 2","tip 3"],"sections":[{"name":"Section Name","headline":"H1 or H2 text","subheadline":"supporting copy","body":"body copy","cta_primary":"CTA button text","cta_secondary":"optional softer CTA","items":[{"title":"item title","body":"item body"}],"steps":[{"step":"step name","body":"step description"}],"copy":"free-form copy for this section","seo_note":"SEO note for this section"}]}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
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
