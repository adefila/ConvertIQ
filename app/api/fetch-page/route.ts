import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

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

    // Strategy 1: Jina Reader — renders JS, best for React/Next.js/Framer/Webflow sites
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'Mozilla/5.0 (compatible; ConvertIQ/1.0)',
          'X-Timeout': '15',
          ...(process.env.JINA_API_KEY ? { 'Authorization': `Bearer ${process.env.JINA_API_KEY}` } : {}),
        },
        signal: AbortSignal.timeout(15000),
      })
      if (jinaRes.ok) {
        const text = await jinaRes.text()
        const trimmed = text.trim()
        if (
          trimmed.length > 500 &&
          !trimmed.startsWith('<!DOCTYPE') &&
          !trimmed.startsWith('<html') &&
          !trimmed.includes('Error fetching')
        ) {
          content = trimmed
          method = 'jina'
        }
      }
    } catch { /* fall through */ }

    // Strategy 2: AllOrigins proxy — good for server-rendered sites
    if (!content) {
      try {
        const aoRes = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(8000) }
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

    // Strategy 3: Direct fetch — works for simple HTML sites
    if (!content) {
      try {
        const directRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(8000),
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

    // Always return JSON — Claude will analyze from URL if no content
    if (!content || content.length < 200) {
      return NextResponse.json({
        content: `Website URL: ${url}\n\nNote: Live page content could not be fetched (the site likely uses JavaScript rendering — React, Next.js, Framer, Webflow, etc). Please analyze this website based on:\n1. The domain name and URL structure\n2. What type of business this appears to be\n3. Common CRO patterns and issues for this industry\n4. Your knowledge of this specific brand if known\nBe transparent that you are inferring rather than reading live content, but still give specific actionable advice.`,
        method: 'url-only',
        length: 0,
      })
    }

    return NextResponse.json({
      content: content.slice(0, 10000),
      method,
      length: content.length,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({
      content: `Website: ${url}. Could not fetch. Analyze based on domain knowledge.`,
      method: 'error',
      error: msg,
    })
  }
}

function extractFromHTML(html: string): string {
  // Remove all noise
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Page metadata
  const title = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/<[^>]+>/g, '').trim() ?? ''
  const metaDesc =
    clean.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ??
    clean.match(/<meta[^>]+content=["']([^"']{20,300})["'][^>]+name=["']description/i)?.[1] ??
    clean.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''
  const ogTitle = clean.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? ''

  // All headings in page order
  const headings: string[] = []
  for (const m of clean.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 2 && text.length < 300) {
      headings.push(`H${m[1]}: ${text}`)
    }
  }

  // All button and link text (CTAs)
  const ctaSet = new Set<string>()
  for (const m of clean.matchAll(/<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 1 && text.length < 100) ctaSet.add(text)
  }

  // Paragraphs and list items — the actual copy
  const paras: string[] = []
  for (const m of clean.matchAll(/<(?:p|li|span|div)\b[^>]*>([\s\S]*?)<\/(?:p|li|span|div)>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text && text.length > 30 && text.length < 600) {
      paras.push(text)
    }
  }

  // Full body text for context
  const bodyText = clean
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return [
    `=== PAGE METADATA ===`,
    `TITLE: ${title}`,
    ogTitle && ogTitle !== title ? `OG TITLE: ${ogTitle}` : '',
    `META DESCRIPTION: ${metaDesc}`,
    '',
    `=== HEADINGS (in page order) ===`,
    headings.slice(0, 30).join('\n'),
    '',
    `=== ALL CTA & BUTTON TEXT ===`,
    [...ctaSet].slice(0, 30).join(' | '),
    '',
    `=== COPY & PARAGRAPHS ===`,
    paras.slice(0, 30).join('\n'),
    '',
    `=== FULL PAGE TEXT ===`,
    bodyText.slice(0, 4000),
  ].filter(Boolean).join('\n')
}
