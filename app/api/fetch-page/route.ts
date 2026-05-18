import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  let url = ''
  try {
    const body = await req.json() as { url?: string }
    url = body.url ?? ''
    if (!url) return NextResponse.json({ content: 'No URL', method: 'error' })

    let content = ''
    let method = ''
    let screenshotUrl = ''

    // ── Screenshot (runs in parallel with text fetch) ──
    // ScreenshotOne: 100 free/month, full-page, renders JS
    if (process.env.SCREENSHOT_API_KEY) {
      screenshotUrl = `https://api.screenshotone.com/take?url=${encodeURIComponent(url)}&access_key=${process.env.SCREENSHOT_API_KEY}&full_page=true&format=jpg&image_quality=80&viewport_width=1440&viewport_height=900&block_cookie_banners=true&block_ads=true`
    } else {
      // Free fallback: thumbnail.ws — no key needed, basic screenshot
      screenshotUrl = `https://image.thum.io/get/width/1440/crop/900/noanimate/${url}`
    }

    // ── Text content fetch ──

    // Strategy 1: Jina with API key — renders full JS, gets ALL sections navbar to footer
    if (process.env.JINA_API_KEY) {
      try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
            'Accept': 'text/plain',
            'X-Return-Format': 'text',
            'X-Timeout': '20',
          },
          signal: AbortSignal.timeout(22000),
        })
        if (res.ok) {
          const text = await res.text()
          if (text && text.length > 500 && !text.startsWith('<!DOCTYPE')) {
            content = text
            method = 'jina-auth'
          }
        }
      } catch { /* fall through */ }
    }

    // Strategy 2: Jina free — still renders JS
    if (!content) {
      try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            'Accept': 'text/plain',
            'X-Timeout': '15',
          },
          signal: AbortSignal.timeout(18000),
        })
        if (res.ok) {
          const text = await res.text()
          if (text && text.length > 300 && !text.startsWith('<!DOCTYPE')) {
            content = text
            method = 'jina-free'
          }
        }
      } catch { /* fall through */ }
    }

    // Strategy 3: AllOrigins proxy
    if (!content) {
      try {
        const res = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(8000) }
        )
        if (res.ok) {
          const data = await res.json() as { contents?: string }
          if (data.contents && data.contents.length > 300) {
            content = extractFromHTML(data.contents)
            method = 'allorigins'
          }
        }
      } catch { /* fall through */ }
    }

    // Strategy 4: Direct HTML fetch
    if (!content) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(8000),
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

    if (!content || content.length < 200) {
      return NextResponse.json({
        content: `Website: ${url}. Could not fetch full page content. Analyze based on domain knowledge and what you know about this brand and industry.`,
        method: 'url-only',
        screenshotUrl,
        length: 0,
      })
    }

    return NextResponse.json({
      content: content.slice(0, 12000),
      method,
      screenshotUrl,
      length: content.length,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({
      content: `Website: ${url}. Analyze based on domain knowledge.`,
      method: 'error',
      screenshotUrl: '',
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

  const title = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''
  const desc = clean.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''

  const headings: string[] = []
  for (const m of clean.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text) headings.push(`H${m[1]}: ${text}`)
  }

  const btns: string[] = []
  for (const m of clean.matchAll(/<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 1 && text.length < 100) btns.push(text)
  }

  const paras: string[] = []
  for (const m of clean.matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 15) paras.push(text)
  }

  const bodyText = clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  return [
    `=== PAGE: ${title} ===`,
    `META: ${desc}`,
    '',
    '=== HEADINGS (navbar to footer, in order) ===',
    headings.join('\n'),
    '',
    '=== ALL CTAs & BUTTONS ===',
    [...new Set(btns)].join(' | '),
    '',
    '=== ALL TEXT CONTENT ===',
    paras.join('\n'),
    '',
    '=== FULL PAGE TEXT ===',
    bodyText.slice(0, 5000),
  ].join('\n')
}
