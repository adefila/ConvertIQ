import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 10

export async function POST(req: NextRequest) {
  let url = ''
  try {
    const body = await req.json() as { url?: string }
    url = body.url ?? ''

    if (!url) {
      return NextResponse.json({ content: 'No URL provided', method: 'error' })
    }

    let content = ''
    let method = ''

    // Try AllOrigins — fast and reliable for basic HTML sites
    try {
      const res = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(3500) }
      )
      if (res.ok) {
        const data = await res.json() as { contents?: string }
        if (data.contents && data.contents.length > 300) {
          content = extractFromHTML(data.contents)
          method = 'allorigins'
        }
      }
    } catch { /* fall through */ }

    // Try direct fetch as backup
    if (!content) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(3500),
        })
        if (res.ok) {
          const html = await res.text()
          if (html && html.length > 300) {
            content = extractFromHTML(html)
            method = 'direct'
          }
        }
      } catch { /* fall through */ }
    }

    // Always return something — Claude will use URL knowledge if no content
    return NextResponse.json({
      content: content.length > 150
        ? content.slice(0, 5000)
        : `Website: ${url}\nAnalyze based on the domain name and your knowledge of this business.`,
      method: content.length > 150 ? method : 'url-only',
      length: content.length,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({
      content: `Website: ${url}. Analyze based on domain knowledge.`,
      method: 'error',
      error: msg,
    })
  }
}

function extractFromHTML(html: string): string {
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const title = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/<[^>]+>/g, '').trim() ?? ''

  const metaDesc =
    clean.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ??
    clean.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''

  const headings: string[] = []
  for (const m of clean.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 2 && text.length < 200) headings.push(`H${m[1]}: ${text}`)
  }

  const btns: string[] = []
  for (const m of clean.matchAll(/<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 1 && text.length < 60) btns.push(text)
  }

  const paras: string[] = []
  for (const m of clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 25 && text.length < 400) paras.push(text)
  }

  return [
    `TITLE: ${title}`,
    `META: ${metaDesc}`,
    'HEADINGS:', headings.slice(0, 15).join('\n'),
    'CTAs:', [...new Set(btns)].slice(0, 20).join(' | '),
    'PARAGRAPHS:', paras.slice(0, 12).join('\n'),
  ].filter(Boolean).join('\n')
}
