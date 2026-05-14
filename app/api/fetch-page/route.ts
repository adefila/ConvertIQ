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

    // Strategy 1: Jina Reader — free, no key, renders JS
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'Mozilla/5.0 (compatible; ConvertIQ/1.0)',
        },
        signal: AbortSignal.timeout(5000),
      })
      if (jinaRes.ok) {
        const text = await jinaRes.text()
        const trimmed = text.trim()
        if (
          trimmed.length > 400 &&
          !trimmed.startsWith('<!DOCTYPE') &&
          !trimmed.startsWith('<html')
        ) {
          content = trimmed
          method = 'jina'
        }
      }
    } catch { /* fall through */ }

    // Strategy 2: AllOrigins proxy
    if (!content) {
      try {
        const aoRes = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (aoRes.ok) {
          const data = await aoRes.json() as { contents?: string }
          if (data.contents && data.contents.length > 300) {
            content = extractFromHTML(data.contents)
            method = 'allorigins'
          }
        }
      } catch { /* fall through */ }
    }

    // Strategy 3: Direct fetch
    if (!content) {
      try {
        const directRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(5000),
        })
        if (directRes.ok) {
          const html = await directRes.text()
          if (html && html.length > 300) {
            content = extractFromHTML(html)
            method = 'direct'
          }
        }
      } catch { /* fall through */ }
    }

    // Fallback — Claude audits from URL knowledge
    if (!content || content.length < 150) {
      return NextResponse.json({
        content: `Website: ${url}\n\nPage content could not be fetched. Analyze based on the domain name, URL path, and your knowledge of this type of business. Be transparent that you are inferring rather than reading live content.`,
        method: 'url-only',
        length: 0,
      })
    }

    return NextResponse.json({
      content: content.slice(0, 6000),
      method,
      length: content.length,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fetch-page]', msg)
    return NextResponse.json({
      content: `URL: ${url}. Could not fetch. Claude will analyze from domain knowledge.`,
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
    clean.match(/<meta[^>]+content=["']([^"']{20,200})["'][^>]+name=["']description/i)?.[1] ??
    clean.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''

  const headings: string[] = []
  for (const m of clean.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 2 && text.length < 200) headings.push(`H${m[1]}: ${text}`)
  }

  const btns: string[] = []
  for (const m of clean.matchAll(/<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 1 && text.length < 80) btns.push(text)
  }

  const paras: string[] = []
  for (const m of clean.matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 25 && text.length < 500) paras.push(text)
  }

  const bodyText = clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  return [
    `TITLE: ${title}`,
    `META: ${metaDesc}`,
    'HEADINGS:', headings.slice(0, 20).join('\n'),
    'CTAs:', [...new Set(btns)].slice(0, 25).join(' | '),
    'PARAGRAPHS:', paras.slice(0, 15).join('\n'),
    'BODY:', bodyText.slice(0, 2000),
  ].filter(Boolean).join('\n')
}
