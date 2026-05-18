import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  let url = ''
  try {
    const body = await req.json() as { url?: string }
    url = body.url ?? ''
    if (!url) return NextResponse.json({ content: 'No URL', method: 'error' })

    // ── Screenshot URL (thum.io - 1000 free/month, no signup needed) ──
    // Correct format: /get/width/1440/crop/900/noanimate/URL
    const screenshotUrl = `https://image.thum.io/get/width/1440/crop/900/noanimate/${url}`

    let content = ''
    let method = ''

    // ── Strategy 1: Jina with API key (best — renders full JS, all sections) ──
    if (process.env.JINA_API_KEY) {
      try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
            'Accept': 'text/plain',
            'X-Return-Format': 'text',
            'X-Timeout': '20',
            'X-No-Cache': 'true',
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

    // ── Strategy 2: Jina free (renders JS, slower) ──
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

    // ── Strategy 3: AllOrigins proxy ──
    if (!content) {
      try {
        const res = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(8000) }
        )
        if (res.ok) {
          const data = await res.json() as { contents?: string }
          if (data.contents && data.contents.length > 300) {
            content = extractAll(data.contents)
            method = 'allorigins'
          }
        }
      } catch { /* fall through */ }
    }

    // ── Strategy 4: Direct HTML fetch ──
    if (!content) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
          const html = await res.text()
          if (html && html.length > 300) {
            content = extractAll(html)
            method = 'direct'
          }
        }
      } catch { /* fall through */ }
    }

    if (!content || content.length < 200) {
      return NextResponse.json({
        content: `Website: ${url}. Could not fetch full page. Analyze based on domain knowledge and what you know about this brand.`,
        method: 'url-only',
        screenshotUrl,
        length: 0,
      })
    }

    return NextResponse.json({
      content: content.slice(0, 15000),
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

// Extract EVERY piece of text from HTML — word for word
function extractAll(html: string): string {
  // Remove non-content elements
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Metadata
  const title = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''
  const desc =
    clean.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ??
    clean.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''
  const ogTitle = clean.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''

  // ALL headings — every single one in page order
  const headings: string[] = []
  for (const m of clean.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text) headings.push(`H${m[1]}: ${text}`)
  }

  // ALL links and buttons (every CTA, nav item, footer link)
  const links: string[] = []
  for (const m of clean.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 1 && text.length < 120) links.push(text)
  }

  // ALL buttons
  const buttons: string[] = []
  for (const m of clean.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 1) buttons.push(text)
  }

  // ALL paragraphs
  const paras: string[] = []
  for (const m of clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 5) paras.push(text)
  }

  // ALL list items
  const listItems: string[] = []
  for (const m of clean.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 5) listItems.push(`• ${text}`)
  }

  // ALL spans and divs with text (catches labels, badges, tags)
  const spans: string[] = []
  for (const m of clean.matchAll(/<span\b[^>]*>([^<]{3,100})<\/span>/gi)) {
    const text = m[1].replace(/\s+/g, ' ').trim()
    if (text) spans.push(text)
  }

  // Full body text — catches anything missed above
  const bodyText = clean
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const sections = [
    `TITLE: ${title}`,
    ogTitle && ogTitle !== title ? `OG TITLE: ${ogTitle}` : '',
    `META DESCRIPTION: ${desc}`,
    '',
    '=== ALL HEADINGS (exact, in page order) ===',
    headings.join('\n'),
    '',
    '=== ALL NAVIGATION & LINKS ===',
    [...new Set(links)].join(' | '),
    '',
    '=== ALL BUTTONS & CTAs ===',
    [...new Set(buttons)].join(' | '),
    '',
    '=== ALL PARAGRAPHS (exact text) ===',
    paras.join('\n'),
    '',
    '=== ALL LIST ITEMS ===',
    listItems.join('\n'),
    '',
    '=== LABELS, BADGES, TAGS ===',
    [...new Set(spans)].slice(0, 50).join(' | '),
    '',
    '=== COMPLETE PAGE TEXT (word for word) ===',
    bodyText,
  ].filter(Boolean)

  return sections.join('\n')
}
