import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string; pageContent?: string; fetchMethod?: string; screenshotUrl?: string }
    const { url, pageContent, fetchMethod, screenshotUrl } = body

    if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    const isCustom = fetchMethod === 'custom' &&
      typeof pageContent === 'string' &&
      pageContent.startsWith('CUSTOM_REWRITE:')
    const copyText = isCustom ? pageContent.replace('CUSTOM_REWRITE:\n', '') : ''
    const hasContent = !isCustom && pageContent && pageContent.length > 300 && !pageContent.startsWith('Website:')
    const content = hasContent ? pageContent!.slice(0, 8000) : ''

    const systemPrompt = `You are a CRO (Conversion Rate Optimization) expert. You ONLY respond with valid JSON objects. Never write any text before or after the JSON. Never apologize. Never explain. Just output the JSON.`

    const userPrompt = isCustom
      ? `Rewrite this copy to be outcome-focused for ${url}. Return ONLY the rewritten copy:\n\n${copyText}`
      : `Audit this website for CRO: ${url}

${content ? `PAGE CONTENT:\n${content}` : `Use your knowledge of this website.`}

Identify every section top to bottom. Output ONLY this JSON (compact, no whitespace between fields, all string values max 20 words):

{"scores":{"conversion":52,"ux":65,"cta":44,"trust":55,"mobile":62},"score_notes":{"conversion":"note","ux":"note","cta":"note","trust":"note","mobile":"note"},"sections":[{"name":"Navigation","score":70,"what_we_found":"description","issues":[{"severity":"high","what":"issue","why":"reason","fix":"fix"}],"copy_rewrite":{"label":"label","original":"original","improved":"improved"}},{"name":"Hero","score":50,"what_we_found":"description","issues":[{"severity":"high","what":"issue","why":"reason","fix":"fix"}],"copy_rewrite":{"label":"label","original":"original","improved":"improved"}}],"overall_issues":[{"severity":"high","title":"title","description":"desc","fix":"fix"}],"copy":{"headline":{"original":"h1","improved":"rewrite"},"subheadline":{"original":"sub","improved":"rewrite"},"cta":{"original":"cta","improved":"rewrite"},"benefits":{"original":"benefits","improved":"rewrite"}},"recommendations":[{"icon":"zap","title":"title","description":"desc","impact":"high"}],"layout":[{"title":"title","description":"desc"}]}

Include all sections found, 6 recommendations, 5 layout items, 3 overall issues.`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: isCustom ? 400 : 5000,
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

    if (isCustom) {
      return NextResponse.json({
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
      })
    }

    // Strip any text before the first { and after the last }
    let clean = fullText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const s = clean.indexOf('{')
    const e = clean.lastIndexOf('}')
    if (s !== -1 && e !== -1) {
      clean = clean.slice(s, e + 1)
    } else {
      return NextResponse.json({ error: 'No JSON found in response. Please try again.' }, { status: 500 })
    }

    try {
      const result = JSON.parse(clean)
      return NextResponse.json({ ok: true, result, screenshotUrl: screenshotUrl ?? '' })
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      return NextResponse.json({ error: `Parse failed: ${msg}` }, { status: 500 })
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
