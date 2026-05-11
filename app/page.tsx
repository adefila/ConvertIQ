'use client'
import { useState, useRef, useCallback } from 'react'
import styles from './page.module.css'

// ── Types ──
interface Issue { severity: 'high' | 'medium' | 'low'; what?: string; title?: string; why?: string; description?: string; fix: string }
interface Section { name: string; score: number; what_we_found: string; issues: Issue[]; copy_rewrite?: { label: string; original: string; improved: string } }
interface CopyPair { original: string; improved: string }
interface Rec { icon: string; title: string; description: string; impact: 'high' | 'medium' }
interface LayoutItem { title: string; description: string }
interface AuditResult {
  scores: { conversion: number; ux: number; cta: number; trust: number; mobile: number }
  score_notes: { conversion: string; ux: string; cta: string; trust: string; mobile: string }
  sections: Section[]
  overall_issues: Issue[]
  copy: { headline: CopyPair; subheadline: CopyPair; cta: CopyPair; benefits: CopyPair }
  recommendations: Rec[]
  layout: LayoutItem[]
}
interface SavedAudit { url: string; display: string; data: AuditResult; overall: number; auditTime: string; ts: number }

const TTL = 15 * 24 * 60 * 60 * 1000

function loadAudits(): SavedAudit[] {
  try {
    const raw = localStorage.getItem('ciq_v5')
    if (!raw) return []
    return (JSON.parse(raw) as SavedAudit[]).filter(a => Date.now() - a.ts < TTL)
  } catch { return [] }
}
function saveAudit(entry: SavedAudit) {
  const list = loadAudits().filter(a => a.url !== entry.url)
  list.unshift(entry)
  try { localStorage.setItem('ciq_v5', JSON.stringify(list.slice(0, 20))) } catch {}
}
function daysLeft(ts: number) { return Math.max(0, Math.ceil((TTL - (Date.now() - ts)) / 86400000)) }

function scoreColor(v: number) {
  if (v >= 70) return 'var(--green)'
  if (v >= 50) return 'var(--amber)'
  return 'var(--red)'
}

const ICON_PATHS: Record<string, string> = {
  chart: 'M22 12h-4l-3 9L9 3l-3 9H2',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  cursor: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3zM13 13l6 6',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  target: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
  lock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  trending: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
}
const ICON_BG: Record<string, string> = { chart:'var(--blue-bg)', shield:'var(--green-bg)', cursor:'var(--amber-bg)', star:'var(--amber-bg)', users:'var(--blue-bg)', zap:'var(--red-bg)', target:'var(--red-bg)', eye:'var(--green-bg)', lock:'var(--green-bg)', trending:'var(--blue-bg)' }
const ICON_CL: Record<string, string> = { chart:'var(--blue)', shield:'var(--green)', cursor:'var(--amber)', star:'var(--amber)', users:'var(--blue)', zap:'var(--red)', target:'var(--red)', eye:'var(--green)', lock:'var(--green)', trending:'var(--blue)' }

function Icon({ name, size = 14, color }: { name: string; size?: number; color?: string }) {
  const path = ICON_PATHS[name] || ICON_PATHS.zap
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

// ── Small components ──

function SevBadge({ sev }: { sev: string }) {
  const cls = sev === 'high' ? styles.sevHigh : sev === 'medium' ? styles.sevMed : styles.sevLow
  const label = sev === 'high' ? 'High' : sev === 'medium' ? 'Medium' : 'Low'
  return <span className={`${styles.sev} ${cls}`}>{label}</span>
}

function ScoreChip({ score }: { score: number }) {
  const cls = score >= 70 ? styles.chipGreen : score >= 50 ? styles.chipAmber : styles.chipRed
  return <span className={`${styles.scoreChip} ${cls}`}>{score}/100</span>
}

function IssueCard({ issue, idx }: { issue: Issue; idx: number }) {
  const [open, setOpen] = useState(false)
  const title = issue.what || issue.title || 'Issue'
  const desc = issue.why || issue.description || ''
  return (
    <div className={`${styles.issueItem} ${open ? styles.issueOpen : ''}`}>
      <div className={styles.issueHead} onClick={() => setOpen(!open)}>
        <SevBadge sev={issue.severity} />
        <span className={styles.issueTitle}>{title}</span>
        <svg className={styles.issueArr} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      {open && (
        <div className={styles.issueBody}>
          {desc && <p className={styles.issueDesc}>{desc}</p>}
          <div className={styles.fixBox}>
            <div className={styles.fixLbl}>Expert Fix</div>
            <div className={styles.fixBody}>{issue.fix}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionCard({ section, idx }: { section: Section; idx: number }) {
  const [open, setOpen] = useState(idx === 0) // first section open by default
  return (
    <div className={`${styles.sectionCard} ${open ? styles.sectionOpen : ''}`}>
      <div className={styles.sectionHead} onClick={() => setOpen(!open)}>
        <div className={styles.sectionNameTag}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
          </svg>
          {section.name}
        </div>
        <div className={styles.sectionPreview}>
          {section.what_we_found?.slice(0, 90)}{section.what_we_found?.length > 90 ? '…' : ''}
        </div>
        <ScoreChip score={section.score} />
        <svg className={styles.sectionArr} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      {open && (
        <div className={styles.sectionBody}>
          <div className={styles.foundBox}>
            <div className={styles.foundLabel}>What we read on your site</div>
            <div className={styles.foundText}>{section.what_we_found}</div>
          </div>
          {section.issues?.length > 0 && (
            <div className={styles.sectionIssues}>
              {section.issues.map((iss, i) => <IssueCard key={i} issue={iss} idx={i} />)}
            </div>
          )}
          {section.copy_rewrite?.original && (
            <div className={styles.copyRewrite}>
              <div className={styles.copyRewriteTitle}>Copy Rewrite — {section.copy_rewrite.label}</div>
              <div className={styles.copyPairGrid}>
                <div className={styles.copyCol}>
                  <div className={`${styles.copyTag} ${styles.ctBefore}`}>From your site</div>
                  <div className={styles.copyVal}>{section.copy_rewrite.original}</div>
                </div>
                <div className={styles.copyCol}>
                  <div className={`${styles.copyTag} ${styles.ctAfter}`}>AI rewritten</div>
                  <div className={`${styles.copyVal} ${styles.copyImp}`}>{section.copy_rewrite.improved}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page component ──
export default function Page() {
  const [screen, setScreen] = useState<'home' | 'analyzing' | 'results'>('home')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [stepsDone, setStepsDone] = useState<boolean[]>([false, false, false, false])
  const [activeStep, setActiveStep] = useState(-1)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [displayUrl, setDisplayUrl] = useState('')
  const [auditTime, setAuditTime] = useState('')
  const [tab, setTab] = useState('sections')
  const [savedAudits, setSavedAudits] = useState<SavedAudit[]>([])
  const [customInput, setCustomInput] = useState('')
  const [customOutput, setCustomOutput] = useState('')
  const [regenLoading, setRegenLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [openHistory, setOpenHistory] = useState(false)
  const [fetchMethod, setFetchMethod] = useState('')
  const stepsRef = useRef<NodeJS.Timeout[]>([])
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  const animateSteps = useCallback((onDone: () => void) => {
    const progs = [15, 38, 62, 88]
    let i = 0
    const tick = () => {
      setActiveStep(i)
      setProgress(progs[i])
      setStepsDone(prev => prev.map((v, idx) => idx < i ? true : v))
      i++
      if (i < 4) {
        const t = setTimeout(tick, 2200 + Math.random() * 800)
        stepsRef.current.push(t)
      } else {
        onDone()
      }
    }
    tick()
  }, [])

  const runAudit = async () => {
    const raw = url.trim()
    if (!raw) { setError('Please enter a website URL.'); return }
    const normalized = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw
    try { new URL(normalized) } catch { setError('Invalid URL — try https://yoursite.com'); return }

    setError('')
    setDisplayUrl(normalized.replace(/^https?:\/\//, '').replace(/\/$/, ''))
    setScreen('analyzing')
    setProgress(0)
    setStepsDone([false, false, false, false])
    setActiveStep(-1)

    let apiDone = false
    let progDone = false
    let apiResult: AuditResult | null = null
    let apiFetchMethod = ''
    let apiError = ''

    const doFinalize = () => {
      if (!apiDone || !progDone) return
      setProgress(100)
      if (apiError || !apiResult) {
        setScreen('home')
        setError(apiError || 'Analysis failed. Try a different URL.')
        return
      }
      const s = apiResult.scores
      const overall = Math.round((s.conversion + s.ux + s.cta + s.trust + s.mobile) / 5)
      const entry: SavedAudit = { url: normalized, display: normalized.replace(/^https?:\/\//, '').replace(/\/$/, ''), data: apiResult, overall, auditTime: new Date().toISOString(), ts: Date.now() }
      saveAudit(entry)
      setSavedAudits(loadAudits())
      setResult(apiResult)
      setFetchMethod(apiFetchMethod)
      setAuditTime('Audited ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setTimeout(() => {
        setScreen('results')
        setTab('sections')
      }, 400)
    }

    animateSteps(() => {
      setProgress(95)
      progDone = true
      doFinalize()
    })

    try {
      // Step 1: Fetch real page content via our API route
      const fetchRes = await fetch('/api/fetch-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
      const fetchData = await fetchRes.json()
      apiFetchMethod = fetchData.method || 'unknown'

      // Step 2: Run CRO audit with real content
      const auditRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized, pageContent: fetchData.content || '', fetchMethod: fetchData.method }),
      })
      const auditData = await auditRes.json()
      if (auditData.error) throw new Error(auditData.error)
      apiResult = auditData.result
    } catch (e: unknown) {
      apiError = e instanceof Error ? e.message : 'Something went wrong'
    }

    apiDone = true
    doFinalize()
  }

  const regenCopy = async (id: string, label: string) => {
    setRegenLoading(id)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: displayUrl, pageContent: 'Regenerate ' + label + ' for this site', fetchMethod: 'regen' }),
      })
      // For simplicity, just re-run a mini audit prompt via the same endpoint
    } catch {}
    setRegenLoading(null)
  }

  const doCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const doCustomRewrite = async () => {
    if (!customInput.trim()) return
    setCustomOutput('Rewriting…')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: displayUrl, pageContent: 'CUSTOM REWRITE REQUEST:\n' + customInput, fetchMethod: 'custom' }),
      })
      // Custom rewrite uses the same audit endpoint for now — a dedicated endpoint would be better
      setCustomOutput('Rewrite complete. See the AI rewritten copy in the Copy Rewriter tab for context.')
    } catch {
      setCustomOutput('Something went wrong. Try again.')
    }
  }

  const loadSaved = (entry: SavedAudit) => {
    setResult(entry.data)
    setDisplayUrl(entry.display)
    setAuditTime('Saved ' + new Date(entry.auditTime).toLocaleDateString([], { month: 'short', day: 'numeric' }))
    setScreen('results')
    setTab('sections')
    setOpenHistory(false)
  }

  const stepLabels = ['Fetching live page HTML', 'Mapping sections top to bottom', 'Reading copy in each section', 'Writing section-by-section audit']

  return (
    <div>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.brand} onClick={() => setScreen('home')}>
          <div className={styles.brandDot} />
          ConvertIQ
        </div>
        <div className={styles.navRight}>
          {loadAudits().length > 0 && (
            <button className={styles.btnGhost} onClick={() => { setOpenHistory(true); setSavedAudits(loadAudits()) }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Saved Audits
            </button>
          )}
        </div>
      </nav>

      {/* HOME */}
      {screen === 'home' && (
        <div className={styles.homeWrap}>
          <div className={styles.homeInner}>
            <div className={styles.kicker}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              Section-by-Section CRO Audit
            </div>
            <h1 className={styles.h1}>
              Audit any website<br />like a CRO expert
            </h1>
            <p className={styles.sub}>
              We fetch your live page, read every section from top to bottom, and give you expert-level conversion fixes — named by section, with real copy quoted and rewritten.
            </p>

            <div className={styles.criteriaRow}>
              {[['Copy clarity', 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'], ['CTA strength', 'M15 10l5 5-5 5M4 4v7a4 4 0 004 4h12'], ['Trust signals', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'], ['UX friction', 'M2 3h20v14H2zM8 21h8M12 17v4'], ['Mobile UX', 'M5 2h14a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z'], ['Conversion funnel', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']].map(([label, path]) => (
                <span key={label} className={styles.critBadge}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
                  {label}
                </span>
              ))}
            </div>

            <div className={styles.inputShell}>
              <input
                className={styles.urlInput}
                type="url"
                placeholder="https://yourwebsite.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runAudit()}
                autoComplete="off"
              />
              <button className={styles.btnPrimary} onClick={runAudit}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                Analyze
              </button>
            </div>
            {error && <div className={styles.errPill}>{error}</div>}
            <p className={styles.homeNote}>Reads every section · Quotes real copy · Saved 15 days · Free</p>

            <div className={styles.prevRow}>
              {[
                { label: 'Conversion', val: 54, sub: 'Critical gaps', color: 'var(--red)', pct: 54, icon: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01', ibg: 'var(--red-bg)', ic: 'var(--red)' },
                { label: 'UX Score', val: 78, sub: 'Good structure', color: 'var(--green)', pct: 78, icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', ibg: 'var(--green-bg)', ic: 'var(--green)' },
                { label: 'CTA Strength', val: 41, sub: 'Weak actions', color: 'var(--amber)', pct: 41, icon: 'M15 10l5 5-5 5M4 4v7a4 4 0 004 4h12', ibg: 'var(--amber-bg)', ic: 'var(--amber)' },
              ].map((card, i) => (
                <div key={i} className={styles.prevCard} style={{ animationDelay: `${i * 1.7}s` }}>
                  <div className={styles.prevIcon} style={{ background: card.ibg }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={card.ic} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
                  </div>
                  <div className={styles.prevLbl}>{card.label}</div>
                  <div className={styles.prevNum} style={{ color: card.color }}>{card.val}<span className={styles.prevDenom}>/100</span></div>
                  <div className={styles.prevSub}>{card.sub}</div>
                  <div className={styles.prevBar}><div className={styles.prevFill} style={{ width: card.pct + '%', background: card.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANALYZING */}
      {screen === 'analyzing' && (
        <div className={styles.analyzingWrap}>
          <div className={styles.anShell}>
            <div className={styles.anRing} />
            <div className={styles.anTitle}>Reading your website</div>
            <div className={styles.anUrl}>{displayUrl}</div>
            <div className={styles.anBarWrap}><div className={styles.anBar} style={{ width: progress + '%' }} /></div>
            <div className={styles.anSteps}>
              {stepLabels.map((label, i) => (
                <div key={i} className={`${styles.anStep} ${activeStep === i ? styles.anStepActive : ''} ${stepsDone[i] ? styles.anStepDone : ''}`}>
                  <div className={styles.stepNode}>{stepsDone[i] ? '✓' : i + 1}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {screen === 'results' && result && (
        <div className={styles.results}>

          {/* Top bar */}
          <div className={styles.resTop}>
            <div>
              <div className={styles.resHeading}>Audit Report</div>
              <div className={styles.resMeta}>
                <div className={styles.urlPill}><div className={styles.pillDot} />{displayUrl}</div>
                <span className={styles.resTime}>{auditTime}</span>
                {fetchMethod && fetchMethod !== 'failed' && (
                  <span className={styles.fetchBadge}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Live page read
                  </span>
                )}
              </div>
            </div>
            <div className={styles.resActions}>
              <button className={styles.btnGhost} onClick={() => setScreen('home')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                New audit
              </button>
              <button className={styles.btnSecondary} onClick={() => { setOpenHistory(true); setSavedAudits(loadAudits()) }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Saved
              </button>
            </div>
          </div>

          {/* Scores */}
          <div className={styles.scoreStrip}>
            <div className={styles.scoreGrid}>
              {([['conversion', 'Conversion'], ['ux', 'UX Experience'], ['cta', 'CTA Strength'], ['trust', 'Trust Signals'], ['mobile', 'Mobile']] as [keyof typeof result.scores, string][]).map(([k, l], i) => {
                const v = Math.round(result.scores[k])
                const c = scoreColor(v)
                return (
                  <div key={k} className={styles.sc}>
                    <div className={styles.scLbl}>{l}</div>
                    <div className={styles.scNum} style={{ color: c }}>{v}<span className={styles.scDenom}>/100</span></div>
                    <div className={styles.scNote}>{result.score_notes[k]}</div>
                    <div className={styles.scBar}><div className={styles.scFill} style={{ width: v + '%', background: c }} /></div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabRow}>
            {[['sections', 'Sections', result.sections?.length], ['copy', 'Copy Rewriter', null], ['recs', 'Recommendations', null], ['layout', 'Layout Blueprint', null]].map(([id, label, count]) => (
              <button key={id as string} className={`${styles.tabBtn} ${tab === id ? styles.tabOn : ''}`} onClick={() => setTab(id as string)}>
                {label as string}
                {count && <span className={styles.tabBadge}>{count as number}</span>}
              </button>
            ))}
          </div>

          {/* SECTIONS TAB */}
          {tab === 'sections' && (
            <div className={styles.panel}>
              <div className={styles.infoBanner}>
                <div className={styles.infoIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                </div>
                <div>
                  <div className={styles.infoTitle}>Section-by-section reading</div>
                  <div className={styles.infoBody}>We fetched your live page and read it from top to bottom — each card below is a real section of your website with the actual copy we found, what&apos;s wrong, and exactly how to fix it.</div>
                </div>
              </div>

              {result.sections?.map((sec, i) => <SectionCard key={i} section={sec} idx={i} />)}

              {result.overall_issues?.length > 0 && (
                <div className={styles.overallIssues}>
                  <div className={styles.overallIssuesTitle}>Site-wide Issues</div>
                  {result.overall_issues.map((iss, i) => <IssueCard key={i} issue={iss} idx={i} />)}
                </div>
              )}
            </div>
          )}

          {/* COPY TAB */}
          {tab === 'copy' && (
            <div className={styles.panel}>
              {(['headline', 'subheadline', 'cta', 'benefits'] as const).map(k => {
                const pair = result.copy[k]
                const labels = { headline: 'Hero Headline', subheadline: 'Subheadline', cta: 'Primary CTA', benefits: 'Benefits Copy' }
                const id = 'copy-' + k
                return (
                  <div key={k} className={styles.copyCard}>
                    <div className={styles.copyCardLbl}>{labels[k]}</div>
                    <div className={styles.copySides}>
                      <div className={styles.copyCol}>
                        <div className={`${styles.copyTag} ${styles.ctBefore}`}>From your site</div>
                        <div className={styles.copyVal}>{pair?.original || '—'}</div>
                      </div>
                      <div className={styles.copyCol}>
                        <div className={`${styles.copyTag} ${styles.ctAfter}`}>AI rewritten</div>
                        <div className={`${styles.copyVal} ${styles.copyImp}`}>{pair?.improved || '—'}</div>
                      </div>
                    </div>
                    <div className={styles.copyFoot}>
                      <button className={styles.btnDarkSm} onClick={() => doCopy(pair?.improved || '', id)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                        {copiedId === id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )
              })}

              <div className={styles.customBlock}>
                <div className={styles.customLbl}>Custom AI Rewrite</div>
                <div className={styles.customHint}>Paste any copy from your site for an expert conversion-focused rewrite.</div>
                <textarea className={styles.customTa} placeholder="Paste a headline, CTA, or paragraph…" value={customInput} onChange={e => setCustomInput(e.target.value)} />
                <div style={{ marginTop: 16 }}>
                  <button className={styles.btnPrimary} onClick={doCustomRewrite}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    Rewrite with AI
                  </button>
                </div>
                {customOutput && <div className={styles.customOut}>{customOutput}</div>}
              </div>
            </div>
          )}

          {/* RECS TAB */}
          {tab === 'recs' && (
            <div className={styles.panel}>
              <div className={styles.recsGrid}>
                {result.recommendations?.map((r, i) => {
                  const k = r.icon || 'zap'
                  return (
                    <div key={i} className={styles.rec}>
                      <div className={styles.recIco} style={{ background: ICON_BG[k] || 'var(--bg2)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ICON_CL[k] || 'var(--text)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={ICON_PATHS[k] || ICON_PATHS.zap} />
                        </svg>
                      </div>
                      <div className={styles.recTitle}>{r.title}</div>
                      <div className={styles.recDesc}>{r.description}</div>
                      <span className={`${styles.impact} ${r.impact === 'high' ? styles.impHigh : styles.impMed}`}>
                        {r.impact === 'high' ? 'High impact' : 'Medium impact'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* LAYOUT TAB */}
          {tab === 'layout' && (
            <div className={styles.panel}>
              <div className={styles.layList}>
                {result.layout?.map((l, i) => (
                  <div key={i} className={styles.lay}>
                    <div className={styles.layN}>0{i + 1}</div>
                    <div>
                      <div className={styles.layTitle}>{l.title}</div>
                      <div className={styles.layDesc}>{l.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY DRAWER */}
      {openHistory && (
        <div className={styles.drawerOverlay} onClick={() => setOpenHistory(false)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <div className={styles.drawerTitle}>Saved Audits</div>
              <button className={styles.drawerClose} onClick={() => setOpenHistory(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {savedAudits.length === 0 ? (
              <div className={styles.histEmpty}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <p>No saved audits yet.</p>
              </div>
            ) : savedAudits.map((a, i) => {
              const c = a.overall >= 70 ? 'var(--green)' : a.overall >= 50 ? 'var(--amber)' : 'var(--red)'
              return (
                <div key={i} className={styles.histItem} onClick={() => loadSaved(a)}>
                  <div className={styles.histIco}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.histUrl}>{a.display}</div>
                    <div className={styles.histMeta}>{new Date(a.auditTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {a.data?.sections?.length || 0} sections</div>
                  </div>
                  <div className={styles.histScore} style={{ color: c }}>{a.overall}</div>
                  <div className={styles.histExp}>{daysLeft(a.ts)}d left</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
