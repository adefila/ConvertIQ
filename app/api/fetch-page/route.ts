import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  let url = ''
  try {
    const body = await req.json() as { url?: string }
    url = body.url ?? ''
    if (!url) return NextResponse.json({ content: 'No URL', method: 'error' })

    // Screenshot URL - thum.io, no key needed, 1000 free/month
    const screenshotUrl = `https://image.thum.io/get/width/1440/crop/900/noanimate/${url}`

    let content = ''
    let method = ''

    // ── Strategy 1: Jina with ReaderLM-v2 engine (best accuracy for JS sites) ──
    // ReaderLM-v2 is specifically built for complex JS-heavy pages
    if (process.env.JINA_API_KEY) {
      try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
            'Accept': 'text/plain',
            'X-Return-Format': 'markdown',
            'X-Engine': 'readerlm-v2',   // Better extraction for JS sites
            'X-Timeout': '20',
            'X-No-Cache': 'true',
            'X-With-Links-Summary': 'true',  // Include all links
            'X-With-Images-Summary': 'true', // Include image alt text
          },
          signal: AbortSignal.timeout(22000),
        })
        if (res.ok) {
          const text = await res.text()
          if (text && text.length > 300 && !text.startsWith('<!DOCTYPE')) {
            content = text
            method = 'jina-readerlm-v2'
          }
        }
      } catch { /* fall through */ }
    }

    // ── Strategy 2: Jina with default engine + authenticated ──
    if (!content && process.env.JINA_API_KEY) {
      try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
            'Accept': 'text/plain',
            'X-Return-Format': 'text',
            'X-Timeout': '18',
            'X-No-Cache': 'true',
          },
          signal: AbortSignal.timeout(20000),
        })
        if (res.ok) {
          const text = await res.text()
          if (text && text.length > 300 && !text.startsWith('<!DOCTYPE')) {
            content = text
            method = 'jina-auth'
          }
        }
      } catch { /* fall through */ }
    }

    // ── Strategy 3: Jina free (no key, rate limited but works) ──
    if (!content) {
      try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            'Accept': 'text/plain',
            'X-Timeout': '15',
          },
          signal: AbortSignal.timeout(17000),
        })
        if (res.ok) {
          const text = await res.text()
          if (text && text.length > 300 && !text.startsWith('<!DOCTYPE') && !text.startsWith('<html')) {
            content = text
            method = 'jina-free'
          }
        }
      } catch { /* fall through */ }
    }

    // ── Strategy 4: AllOrigins proxy (good for server-rendered sites) ──
    if (!content) {
      try {
        const res = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(8000) }
        )
        if (res.ok) {
          const data = await res.json() as { contents?: string }
          if (data.contents && data.contents.length > 500) {
            content = extractAll(data.contents)
            method = 'allorigins'
          }
        }
      } catch { /* fall through */ }
    }

    // ── Strategy 5: Direct fetch (simple HTML sites) ──
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
          if (html && html.length > 500) {
            content = extractAll(html)
            method = 'direct'
          }
        }
      } catch { /* fall through */ }
    }

    if (!content || content.length < 200) {
      return NextResponse.json({
        content: `Website: ${url}\n\nCould not fetch page content — the site may block crawlers or require authentication.\n\nPlease analyze this website based on:\n1. The domain name and URL structure\n2. What type of business this appears to be\n3. Common patterns for this industry\nBe transparent that you are inferring rather than reading live content.`,
        method: 'url-only',
        screenshotUrl,
        length: 0,
      })
    }

    // Cap at 15000 chars — enough for a full page top to bottom
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

// Deep extraction — every piece of text from HTML
function extractAll(html: string): string {
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const title = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''
  const desc =
    clean.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ??
    clean.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''
  const ogTitle = clean.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''

  // Every heading in order
  const headings: string[] = []
  for (const m of clean.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text) headings.push(`H${m[1]}: ${text}`)
  }

  // Every nav link
  const navLinks: string[] = []
  const navMatch = clean.match(/<nav[\s\S]*?<\/nav>/gi) ?? []
  for (const nav of navMatch) {
    for (const m of nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
      const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (text && text.length > 1 && text.length < 60) navLinks.push(text)
    }
  }

  // Every button
  const buttons: string[] = []
  for (const m of clean.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 1) buttons.push(text)
  }

  // Every link
  const links: string[] = []
  for (const m of clean.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 1 && text.length < 100) links.push(text)
  }

  // Every paragraph
  const paras: string[] = []
  for (const m of clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 5) paras.push(text)
  }

  // Every list item
  const listItems: string[] = []
  for (const m of clean.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 3) listItems.push(`• ${text}`)
  }

  // Spans and divs with meaningful short text (badges, labels, tags)
  const labels: string[] = []
  for (const m of clean.matchAll(/<span\b[^>]*>([^<]{2,80})<\/span>/gi)) {
    const text = m[1].replace(/\s+/g, ' ').trim()
    if (text) labels.push(text)
  }

  // Full body text dump
  const bodyText = clean
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return [
    `=== PAGE TITLE ===`,
    title,
    ogTitle && ogTitle !== title ? `(OG: ${ogTitle})` : '',
    `\n=== META DESCRIPTION ===`,
    desc,
    `\n=== NAVIGATION ===`,
    [...new Set(navLinks)].join(' | '),
    `\n=== ALL HEADINGS (top to bottom) ===`,
    headings.join('\n'),
    `\n=== BUTTONS & PRIMARY CTAs ===`,
    [...new Set(buttons)].join(' | '),
    `\n=== ALL LINKS ===`,
    [...new Set(links)].slice(0, 40).join(' | '),
    `\n=== PARAGRAPHS (exact text) ===`,
    paras.join('\n'),
    `\n=== LIST ITEMS ===`,
    listItems.join('\n'),
    `\n=== LABELS & BADGES ===`,
    [...new Set(labels)].slice(0, 60).join(' | '),
    `\n=== FULL PAGE TEXT (word for word) ===`,
    bodyText,
  ].filter(Boolean).join('\n')
}
