# ConvertIQ — AI Website Conversion Audit

Section-by-section CRO audit tool. Fetches real live pages and analyzes them like a senior CRO expert.

## How it works

1. User pastes a URL
2. `/api/fetch-page` fetches the real page using **Jina AI Reader** (renders JavaScript, returns clean markdown)
3. `/api/audit` sends the real content to Claude with a section-by-section CRO audit prompt
4. Results are displayed with each page section named, analyzed, and rewritten

## Deploy to Vercel in 3 steps

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create convertiq --public --push
# OR push to your existing repo
```

### Step 2 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy**

### Step 3 — Add environment variables
In Vercel dashboard → Settings → Environment Variables, add:

| Key | Value | Required |
|-----|-------|----------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | ✅ Required |
| `JINA_API_KEY` | `jina_...` | Recommended |

**Get your Anthropic API key:** https://console.anthropic.com  
**Get Jina AI key (free):** https://jina.ai — improves accuracy on JS-heavy sites like React/Next.js apps

Redeploy after adding env vars.

## Local development

```bash
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open http://localhost:3000

## Why Jina AI?

Most websites are built with React, Next.js, or Vue — they render content via JavaScript. A plain HTML fetch returns an empty shell.

**Jina AI Reader** (`r.jina.ai`) is a headless browser service that:
- Fully renders JavaScript
- Returns clean, structured markdown of what users actually see
- Works on SPAs, React apps, Next.js sites
- Free tier: 200 requests/day (plenty for testing)
- With API key: much higher limits

Without Jina, the tool falls back to direct HTML parsing which works on simple sites but misses dynamic content.

## File structure

```
app/
  api/
    fetch-page/route.ts  ← Fetches real page content (Jina AI + fallbacks)
    audit/route.ts       ← Runs CRO audit with Claude
  page.tsx               ← Main UI
  page.module.css        ← All styles
  globals.css            ← CSS variables
  layout.tsx             ← Root layout
```
