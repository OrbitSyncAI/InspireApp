import { useState, useCallback, useEffect, useReducer, useMemo, useRef } from 'react'
import { categories, gradients, allQuotes, currentYear } from './data'
import { staticPages } from './pagesContent'
import { APP_NAME, APP_VERSION, APP_BUILD, RELEASES_PAGE, detectPlatform, platformLabel } from './version'
import { checkForUpdates } from './updateService'

const tabKeys = Object.keys(categories).filter(k => k !== 'LIKED')
const PER_PAGE = 10
const AI_SETTINGS_KEY = 'inspire-ai-settings'
const AI_SAVED_KEY = 'inspire-ai-saved-quotes'
const AI_LIKED_KEY = 'inspire-ai-liked-quotes'
const AI_PROVIDERS = {
  gemini: { label: 'Gemini', defaultModel: 'gemini-3.1-flash-lite', models: ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
  openai: { label: 'ChatGPT', defaultModel: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini', 'o3-mini'] },
  claude: { label: 'Claude', defaultModel: 'claude-3-5-haiku-20241022', models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-7-sonnet-latest', 'claude-3-opus-20240229'] },
  groq: { label: 'Groq', defaultModel: 'llama-3.1-8b-instant', models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
  mistral: { label: 'Mistral', defaultModel: 'mistral-small-latest', models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'open-mistral-nemo', 'codestral-latest'] },
  openrouter: { label: 'OpenRouter', defaultModel: 'openai/gpt-4o-mini', models: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'google/gemini-flash-1.5', 'anthropic/claude-3.5-haiku', 'meta-llama/llama-3.1-8b-instruct', 'mistralai/mistral-small'] },
  deepseek: { label: 'DeepSeek', defaultModel: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-reasoner'] },
}
const AI_LANGUAGES = [
  'Hindi', 'English', 'Hinglish', 'Urdu', 'Arabic', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Punjabi', 'Kannada', 'Malayalam', 'Odia', 'Assamese', 'Sanskrit',
  'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Turkish', 'Persian', 'Indonesian', 'Malay', 'Thai', 'Vietnamese',
  'Dutch', 'Greek', 'Polish', 'Ukrainian', 'Romanian', 'Czech', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Hebrew', 'Swahili',
]

function favReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': return state.includes(action.text) ? state.filter(t => t !== action.text) : [...state, action.text]
    case 'REMOVE': return state.filter(t => t !== action.text)
    case 'RESTORE': return action.payload
    default: return state
  }
}

function getSavedIndex(cat) { try { return parseInt(localStorage.getItem('inspire-idx-'+cat) || '0', 10) } catch { return 0 } }
function saveIndex(cat, idx) { try { localStorage.setItem('inspire-idx-'+cat, String(idx)) } catch {} }

function dailyQuoteIndex() {
  const d = new Date()
  const key = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate()
  return key % Math.max(allQuotes.length, 1)
}

function loadAiSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}')
    const providers = Object.fromEntries(Object.entries(AI_PROVIDERS).map(([key, meta]) => [
      key,
      { apiKey: '', model: meta.defaultModel, ...(saved.providers?.[key] || {}) },
    ]))
    return {
      defaultProvider: AI_PROVIDERS[saved.defaultProvider] ? saved.defaultProvider : 'gemini',
      providers,
    }
  } catch {
    return {
      defaultProvider: 'gemini',
      providers: Object.fromEntries(Object.entries(AI_PROVIDERS).map(([key, meta]) => [key, { apiKey: '', model: meta.defaultModel }])),
    }
  }
}

function loadSavedAiQuotes() {
  try { return JSON.parse(localStorage.getItem(AI_SAVED_KEY) || '[]') } catch { return [] }
}

function loadLikedAiQuotes() {
  try { return JSON.parse(localStorage.getItem(AI_LIKED_KEY) || '[]') } catch { return [] }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

function downloadQuoteImage(quote, label = 'Inspire') {
  if (!quote) return
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')

  // Curated premium gradients/themes
  const themes = [
    { bgStart: '#0f172a', bgEnd: '#1e1b4b', accent: '#f59e0b', text: '#ffffff', blobs: ['#ec4899', '#6366f1', '#14b8a6'] },
    { bgStart: '#064e3b', bgEnd: '#022c22', accent: '#34d399', text: '#f0fdf4', blobs: ['#059669', '#10b981', '#fbbf24'] },
    { bgStart: '#311042', bgEnd: '#12021c', accent: '#f472b6', text: '#fdf2f8', blobs: ['#db2777', '#7c3aed', '#f43f5e'] },
    { bgStart: '#1c1917', bgEnd: '#0c0a09', accent: '#fb923c', text: '#fafaf9', blobs: ['#ea580c', '#eab308', '#dc2626'] },
    { bgStart: '#0f172a', bgEnd: '#020617', accent: '#38bdf8', text: '#f0f9ff', blobs: ['#2563eb', '#06b6d4', '#4f46e5'] },
  ]
  const theme = themes[Math.floor(Math.random() * themes.length)]

  // 1. Draw solid background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  grad.addColorStop(0, theme.bgStart)
  grad.addColorStop(1, theme.bgEnd)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. Draw glowing mesh blobs
  theme.blobs.forEach((color, idx) => {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const x = idx === 0 ? 200 : idx === 1 ? 880 : 540
    const y = idx === 0 ? 300 : idx === 1 ? 1000 : 675
    const radius = 300 + Math.random() * 200
    const radGrad = ctx.createRadialGradient(x, y, 0, x, y, radius)
    radGrad.addColorStop(0, color + '77') // Semi-transparent
    radGrad.addColorStop(0.5, color + '22')
    radGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = radGrad
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })

  // 3. Draw glassmorphism card container (Darker semi-transparent card)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'
  ctx.beginPath()
  ctx.roundRect(80, 100, 920, 1150, 48)
  ctx.fill()

  // Inner card glow border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 4
  ctx.stroke()

  // 4. Header Text
  ctx.fillStyle = theme.accent
  ctx.textAlign = 'center'
  ctx.font = '800 48px system-ui, -apple-system, sans-serif'
  ctx.fillText(label.toUpperCase(), 540, 190)

  // Decorative quotes icon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.font = '900 320px Georgia, serif'
  ctx.fillText('“', 220, 440)

  // 5. Quote Text
  ctx.fillStyle = theme.text
  const textStr = String(quote.text || '')
  const quoteLength = textStr.length
  const fontSize = quoteLength > 300 ? 38 : quoteLength > 180 ? 44 : 50
  ctx.font = `italic 600 ${fontSize}px Georgia, "Times New Roman", serif`
  
  const words = textStr.split(/\s+/)
  let line = ''
  let lines = []
  const maxTextWidth = 780

  words.forEach(word => {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxTextWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  })
  if (line) lines.push(line)

  // Center quotes text vertically in the card
  const lineHeight = Math.round(fontSize * 1.5)
  const totalTextHeight = lines.length * lineHeight
  let y = 675 - (totalTextHeight / 2) + 20

  lines.forEach(l => {
    ctx.fillText(l, 540, y)
    y += lineHeight
  })

  // 6. Draw Divider line
  ctx.fillStyle = theme.accent
  ctx.fillRect(440, Math.min(y + 30, 1090), 200, 4)

  // 7. Author Name
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.font = '700 38px system-ui, -apple-system, sans-serif'
  ctx.fillText(`— ${quote.author || 'AI'}`, 540, Math.min(y + 90, 1150))

  // 8. Footer Brand
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.font = '800 28px system-ui, -apple-system, sans-serif'
  ctx.fillText(APP_NAME, 540, 1205)

  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inspire-quote.png'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
      link.remove()
    }, 1200)
  }, 'image/png')
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [page, setPage] = useState(() => localStorage.getItem('inspire-page') || 'quotes')
  const [tab, setTabState] = useState(() => localStorage.getItem('inspire-tab') || 'MOTIVATION')
  const [index, setIndex] = useState(() => getSavedIndex(localStorage.getItem('inspire-tab') || 'MOTIVATION'))
  const [favorites, dispatchFav] = useReducer(favReducer, [], () => {
    try { return JSON.parse(localStorage.getItem('inspire-favs') || '[]') } catch { return [] }
  })
  const [copied, setCopied] = useState(false)
  const [toastText, setToastText] = useState('')
  const triggerToast = useCallback((msg) => {
    setToastText(msg)
  }, [])
  useEffect(() => {
    if (toastText) {
      const t = setTimeout(() => setToastText(''), 2200)
      return () => clearTimeout(t)
    }
  }, [toastText])

  const [dark, setDark] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inspire-dark') || 'false') } catch { return false }
  })
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('inspire-view') || 'card')
  const [listPage, setListPage] = useState(0)
  const [search, setSearch] = useState('')
  const [aiSettings, setAiSettings] = useState(loadAiSettings)
  const [savedAiQuotes, setSavedAiQuotes] = useState(loadSavedAiQuotes)
  const [likedAiQuotes, setLikedAiQuotes] = useState(loadLikedAiQuotes)
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(true)
  const categoryTapRef = useRef({ key: '', time: 0 })

  const allFiltered = useMemo(() => {
    const aiLikedList = likedAiQuotes.filter(q => favorites.includes(q.text))
    let list = tab === 'LIKED'
      ? [...allQuotes.filter(q => favorites.includes(q.text)), ...aiLikedList]
      : allQuotes.filter(q => q.category === tab)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(item =>
        item.text.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q)
      )
    }
    return list
  }, [tab, favorites, likedAiQuotes, search])

  const safeIndex = allFiltered.length > 0 ? index % allFiltered.length : 0
  const quote = allFiltered.length > 0 ? allFiltered[safeIndex] : null
  const isFav = quote && favorites.includes(quote.text)
  const [g1, g2] = gradients[tab] || ['#6C63FF', '#764BA2']

  const totalPages = Math.max(1, Math.ceil(allFiltered.length / PER_PAGE))
  const listStart = listPage * PER_PAGE
  const listQuotes = allFiltered.slice(listStart, listStart + PER_PAGE)
  const dailyQuotes = useMemo(() => {
    const start = dailyQuoteIndex()
    return Array.from({ length: Math.min(5, allQuotes.length) }, (_, i) => allQuotes[(start + i * 17) % allQuotes.length])
  }, [])
  const currentPlatform = useMemo(() => {
    const forced = new URLSearchParams(window.location.search).get('platform')
    return forced || detectPlatform()
  }, [])

  useEffect(() => { localStorage.setItem('inspire-favs', JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { localStorage.setItem('inspire-dark', JSON.stringify(dark)) }, [dark])
  useEffect(() => { localStorage.setItem('inspire-page', page) }, [page])
  useEffect(() => { localStorage.setItem('inspire-tab', tab) }, [tab])
  useEffect(() => { localStorage.setItem('inspire-view', viewMode) }, [viewMode])
  useEffect(() => { localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings)) }, [aiSettings])
  useEffect(() => { localStorage.setItem(AI_SAVED_KEY, JSON.stringify(savedAiQuotes)) }, [savedAiQuotes])
  useEffect(() => { localStorage.setItem(AI_LIKED_KEY, JSON.stringify(likedAiQuotes)) }, [likedAiQuotes])
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { if (page === 'archive') setPage('quotes') }, [page])
  useEffect(() => { setMenuOpen(false) }, [page, tab])
  useEffect(() => { if (copied) { const t = setTimeout(() => setCopied(false), 2200); return () => clearTimeout(t) } }, [copied])
  useEffect(() => { setListPage(0); setIndex(0) }, [tab, search])

  const setTab = useCallback((t) => {
    setTabState(t)
    setIndex(getSavedIndex(t))
    setListPage(0)
  }, [])

  const setIndexWrap = useCallback((idx, cat) => {
    const c = cat || tab
    const qs = c === 'LIKED'
      ? [...allQuotes.filter(q => favorites.includes(q.text)), ...likedAiQuotes.filter(q => favorites.includes(q.text))]
      : allQuotes.filter(q => q.category === c)
    const wrapped = qs.length > 0 ? ((idx % qs.length) + qs.length) % qs.length : 0
    setIndex(wrapped)
    saveIndex(c, wrapped)
  }, [tab, favorites, likedAiQuotes])

  const toggleFav = useCallback(() => {
    if (!quote) return
    const isNowFav = !favorites.includes(quote.text)
    dispatchFav({ type: 'TOGGLE', text: quote.text })
    triggerToast(isNowFav ? 'Added to Liked Quotes ❤️' : 'Removed from Liked Quotes 🤍')
  }, [quote, favorites, triggerToast])

  const toggleFavQuote = useCallback((q) => {
    if (!q?.text) return
    const isNowFav = !favorites.includes(q.text)
    if (q.author === 'AI' || q.provider || q.category === 'AI') {
      setLikedAiQuotes(prev => prev.some(item => item.text === q.text) ? prev : [{ ...q, author: q.author || 'AI', category: 'AI' }, ...prev])
    }
    dispatchFav({ type: 'TOGGLE', text: q.text })
    triggerToast(isNowFav ? 'Added to Liked Quotes ❤️' : 'Removed from Liked Quotes 🤍')
  }, [favorites, triggerToast])

  const saveAnyQuote = useCallback((q) => {
    if (!q?.text) return
    const exists = savedAiQuotes.some(item => item.text === q.text)
    if (exists) {
      triggerToast('Already saved! 💾')
      return
    }
    setSavedAiQuotes(prev => [{ ...q, author: q.author || 'Unknown', savedAt: new Date().toISOString() }, ...prev])
    triggerToast('Quote saved successfully! 💾')
  }, [savedAiQuotes, triggerToast])

  const removeFavInline = useCallback((text) => {
    dispatchFav({ type: 'REMOVE', text })
  }, [])

  const switchToCategory = useCallback((t) => {
    setTab(t)
  }, [setTab])

  const selectMobileCategory = useCallback((t) => {
    if (t === 'LIKED') setTab('LIKED')
    else switchToCategory(t)
  }, [setTab, switchToCategory])

  const collapseMobileCategory = useCallback((t) => {
    if (t === 'LIKED') setTab('LIKED')
    else switchToCategory(t)
    setMobileCategoriesOpen(false)
  }, [setTab, switchToCategory])

  const handleMobileCategoryTap = useCallback((t) => {
    const now = Date.now()
    const last = categoryTapRef.current
    if (last.key === t && now - last.time < 420) {
      collapseMobileCategory(t)
      categoryTapRef.current = { key: '', time: 0 }
      return
    }
    categoryTapRef.current = { key: t, time: now }
    selectMobileCategory(t)
  }, [collapseMobileCategory, selectMobileCategory])

  const copyQuote = useCallback(() => {
    if (!quote) return
    copyText(quote.text).then(ok => { if (ok) triggerToast('Quote copied to clipboard! 📋') })
  }, [quote, triggerToast])

  const copyListQuote = useCallback((text) => {
    copyText(text).then(ok => { if (ok) triggerToast('Quote copied to clipboard! 📋') })
  }, [triggerToast])

  const prevQuote = useCallback(() => {
    if (allFiltered.length > 0) setIndexWrap(safeIndex - 1)
  }, [allFiltered.length, safeIndex, setIndexWrap])

  const nextQuote = useCallback(() => {
    if (allFiltered.length > 0) setIndexWrap(safeIndex + 1)
  }, [allFiltered.length, safeIndex, setIndexWrap])

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const onKey = (e) => {
      if (page !== 'quotes' || viewMode !== 'card') return
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevQuote() }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextQuote() }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFav() }
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); copyQuote() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, viewMode, prevQuote, nextQuote, toggleFav, copyQuote])

  const prevListPage = () => setListPage(p => Math.max(0, p - 1))
  const nextListPage = () => setListPage(p => Math.min(totalPages - 1, p + 1))

  const navTo = (p) => {
    setPage(p === 'archive' ? 'quotes' : p)
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'auto' })
  }

  const goLikedQuotes = () => {
    setPage('quotes')
    setSearch('')
    setViewMode('card')
    setTab('LIKED')
    setIndexWrap(0, 'LIKED')
    setListPage(0)
    setMobileCategoriesOpen(false)
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'auto' })
  }

  const runNavItem = (id) => {
    if (id === 'quotes') goHomeStart()
    else if (id === 'liked') goLikedQuotes()
    else navTo(id)
  }

  const navItemActive = (id) => (
    id === 'liked' ? page === 'quotes' && tab === 'LIKED' : page === id
  )

  const goHomeStart = () => {
    setPage('quotes')
    setSearch('')
    setViewMode('card')
    setTab('MOTIVATION')
    setIndexWrap(0, 'MOTIVATION')
    setListPage(0)
    setMobileCategoriesOpen(true)
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'auto' })
  }

  const navItems = [
    { id: 'quotes', label: 'Home', emoji: '🏠' },
    { id: 'daily', label: 'Daily', emoji: '☀️' },
    { id: 'liked', label: 'Liked Quotes', emoji: '❤️' },
    { id: 'ai', label: 'AI Quotes', emoji: '🤖' },
    { id: 'saved', label: 'Saved Quotes', emoji: '💾' },
    { id: 'about', label: 'About Us', emoji: 'ℹ️' },
    { id: 'contact', label: 'Contact', emoji: '📞' },
    { id: 'privacy', label: 'Privacy', emoji: '🔒' },
    { id: 'terms', label: 'Terms', emoji: '📜' },
    { id: 'disclaimer', label: 'Disclaimer', emoji: '⚠️' },
    { id: 'updates', label: 'Updates', emoji: '🔄' },
  ]
  const bottomNavItems = ['quotes', 'daily', 'ai', 'liked', 'saved']
    .map(id => navItems.find(item => item.id === id))
    .filter(Boolean)

  return (
    <div className={`app-shell platform-${currentPlatform}`}>
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
      <nav className={'offcanvas' + (menuOpen ? ' offcanvas-open' : '')}>
        <button className="offcanvas-close" onClick={() => setMenuOpen(false)}>✕</button>
        <div className="oc-brand">
          <strong>{APP_NAME}</strong>
        </div>
        <div className="offcanvas-links">
          {navItems.map(item => (
            <button key={item.id} className={navItemActive(item.id) ? 'oc-active' : ''} onClick={() => runNavItem(item.id)}>
              {item.emoji} {item.label}
              {item.badge && <span className="nav-badge">New</span>}
            </button>
          ))}
        </div>
        <div className="oc-version-bottom">
          <span>{APP_NAME}</span>
          <strong>v{APP_VERSION}</strong>
        </div>
      </nav>

      <header className="header">
        <div className="header-inner">
          <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu"><span /><span /><span /></button>
          <svg className="logo-svg" onClick={goHomeStart} viewBox="0 0 200 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer' }}>
            <defs>
              <linearGradient id="lgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#667EEA" /><stop offset="100%" stopColor="#F093FB" />
              </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#lgGrad)" opacity="0.15" />
            <path d="M24 10 L20 20 L30 20 L26 30" fill="none" stroke="url(#lgGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="56" y="31" fill="url(#lgGrad)" fontFamily="system-ui, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-0.5">Inspire</text>
          </svg>
          <div className="header-actions">
            <nav className="desktop-nav">
              {navItems.map(item => (
                <button key={item.id} className={navItemActive(item.id) ? 'dn-active' : ''} onClick={() => runNavItem(item.id)}>
                  {item.label}
                  {item.badge && <span className="nav-badge-dot" />}
                </button>
              ))}
            </nav>
            <button className="theme-toggle" onClick={() => setDark(prev => !prev)} title={dark ? 'Light' : 'Dark'}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {page === 'quotes' ? (
          <div className="app desktop-hero" style={{ background: 'linear-gradient(135deg, ' + g1 + ' 0%, ' + g2 + ' 100%)' }}>
            <div className="container desktop-layout">
              <aside className="desktop-side">
                <div className="side-card">
                  <h3>Categories</h3>
                  <div className="side-cats">
                    {tabKeys.map(key => (
                      <button key={key} className={'side-cat' + (key === tab ? ' side-cat-active' : '')} onClick={() => switchToCategory(key)}>
                        <span>{categories[key].emoji}</span> {categories[key].label}
                      </button>
                    ))}
                    <button className={'side-cat' + (tab === 'LIKED' ? ' side-cat-active' : '')} onClick={() => setTab('LIKED')}>
                      <span>{categories.LIKED.emoji}</span> {categories.LIKED.label} ({favorites.length})
                    </button>
                  </div>
                  <p className="side-hint">Keyboard: ← → navigate · F favorite · C copy</p>
                  {currentPlatform === 'windows' && (
                    <div className="windows-ready-box">
                      <strong>Windows Desktop</strong>
                      <span>Wide layout, keyboard controls, smooth scrolling, update checks, and installer-ready configuration.</span>
                    </div>
                  )}
                  {currentPlatform === 'macos' && (
                    <div className="macos-ready-box">
                      <strong>macOS Desktop</strong>
                      <span>Translucent sidebar, large content canvas, keyboard controls, update checks, and DMG-ready configuration.</span>
                    </div>
                  )}
                  {currentPlatform === 'linux' && (
                    <div className="linux-ready-box">
                      <strong>Linux Desktop</strong>
                      <span>GNOME-style spacing, sturdy panels, keyboard controls, update checks, and AppImage/deb-ready configuration.</span>
                    </div>
                  )}
                  {currentPlatform === 'web' && (
                    <div className="web-ready-box">
                      <strong>Web Final</strong>
                      <span>Responsive browser layout, clean content width, smooth scrolling, update visibility, and polished web navigation.</span>
                    </div>
                  )}
                </div>
              </aside>

              <div className="desktop-main-col">
                <div className="mobile-category-shell">
                  <button className="mobile-category-toggle" onClick={() => setMobileCategoriesOpen(v => !v)}>
                    {categories[tab]?.emoji} {categories[tab]?.label || 'Categories'} {tab === 'LIKED' ? `(${favorites.length})` : ''}
                  </button>
                  {mobileCategoriesOpen && (
                    <div className="tabs mobile-only-tabs">
                      {tabKeys.map(key => (
                        <button
                          key={key}
                          className={'tab' + (key === tab ? ' tab-active' : '')}
                          onClick={() => handleMobileCategoryTap(key)}
                        >
                          <span className="tab-emoji">{categories[key].emoji}</span>
                          <span className="tab-label">{categories[key].label}</span>
                        </button>
                      ))}
                      <button
                        className={'tab' + ('LIKED' === tab ? ' tab-active liked-tab' : '')}
                        onClick={() => handleMobileCategoryTap('LIKED')}
                      >
                        <span className="tab-emoji">{categories.LIKED.emoji}</span>
                        <span className="tab-label">{categories.LIKED.label}{favorites.length > 0 ? ' (' + favorites.length + ')' : ''}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="toolbar-row">
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Search quotes or authors…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="Search quotes"
                  />
                  {allFiltered.length > 0 && (
                    <div className="view-toggle">
                      <button className={'vt-btn' + (viewMode === 'card' ? ' vt-active' : '')} onClick={() => setViewMode('card')}>🃏 Card</button>
                      <button className={'vt-btn' + (viewMode === 'list' ? ' vt-active' : '')} onClick={() => setViewMode('list')}>📋 List</button>
                    </div>
                  )}
                </div>

                {allFiltered.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{search ? '🔎' : '💔'}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                      {search ? 'No quotes match your search.' : 'No liked quotes yet. Tap the heart on any quote!'}
                    </p>
                  </div>
                ) : viewMode === 'card' ? (
                  <>
                    <div className="card quote-card-lg">
                      <span className="quote-marks" style={{ color: g1 }}>❝❞</span>
                      <p className="quote-text">{quote.text}</p>
                      <div className="divider" style={{ background: g1 }} />
                      <p className="quote-author">— {quote.author}</p>
                      <div className="actions">
                        <button className="action-btn" onClick={toggleFav} title={isFav ? 'Remove favorite' : 'Add favorite'}>
                          {isFav ? '❤️' : '🤍'}
                        </button>
                        <button className="action-btn" onClick={copyQuote} title="Copy quote only">📋</button>
                        <button className="action-btn" onClick={() => saveAnyQuote(quote)} title="Save quote">💾</button>
                        <button className="action-btn" onClick={() => downloadQuoteImage(quote)} title="Download image">🖼️</button>
                      </div>
                       {tab === 'LIKED' && favorites.length > 0 && (
                        <button className="remove-inline-btn" onClick={() => removeFavInline(quote.text)}>🗑 Remove</button>
                      )}
                      <p className="quote-count">
                        {safeIndex + 1} / {allFiltered.length}
                        {search ? ' matches' : tab === 'LIKED' ? ' liked' : ' in this category'}
                      </p>
                    </div>
                    <div className="nav-row">
                      <button className="nav-btn" onClick={prevQuote} style={{ color: g1 }}>← Previous</button>
                      <button className="nav-btn" onClick={nextQuote} style={{ color: g1 }}>Next →</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="list-container list-wide">
                      {listQuotes.map((q, i) => {
                        const qIsFav = favorites.includes(q.text)
                        return (
                          <div key={i} className="list-card">
                            <div className="list-card-top">
                              <span className="list-num">{listStart + i + 1}</span>
                              <div className="list-actions">
                                <button className="list-action-btn" onClick={() => {
                                  if (qIsFav) dispatchFav({ type: 'REMOVE', text: q.text })
                                  else dispatchFav({ type: 'TOGGLE', text: q.text })
                                }} title={qIsFav ? 'Unlike' : 'Like'}>
                                  {qIsFav ? '❤️' : '🤍'}
                                </button>
                                <button className="list-action-btn" onClick={() => copyListQuote(q.text)} title="Copy">📋</button>
                                <button className="list-action-btn" onClick={() => saveAnyQuote(q)} title="Save">💾</button>
                                <button className="list-action-btn" onClick={() => downloadQuoteImage(q)} title="Download image">🖼️</button>
                                {tab === 'LIKED' && (
                                  <button className="list-remove-btn" onClick={() => removeFavInline(q.text)}>Remove</button>
                                )}
                              </div>
                            </div>
                            <p className="list-quote-text">{q.text}</p>
                            <p className="list-quote-author">— {q.author}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="nav-row">
                      <button className="nav-btn" onClick={prevListPage} disabled={listPage === 0} style={{ color: g1 }}>← Previous</button>
                      <span className="page-indicator">Page {listPage + 1} of {totalPages}</span>
                      <button className="nav-btn" onClick={nextListPage} disabled={listPage >= totalPages - 1} style={{ color: g1 }}>Next →</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : page === 'daily' ? (
          <DailyPage quotes={dailyQuotes} navTo={navTo} onFav={toggleFavQuote} onSave={saveAnyQuote} favorites={favorites} triggerToast={triggerToast} />
        ) : page === 'ai' ? (
          <AiQuotesPage
            settings={aiSettings}
            setSettings={setAiSettings}
            savedQuotes={savedAiQuotes}
            setSavedQuotes={setSavedAiQuotes}
            onFav={toggleFavQuote}
            favorites={favorites}
            triggerToast={triggerToast}
          />
        ) : page === 'saved' ? (
          <SavedQuotesPage
            quotes={savedAiQuotes}
            setQuotes={setSavedAiQuotes}
            onFav={toggleFavQuote}
            favorites={favorites}
            triggerToast={triggerToast}
          />
        ) : page === 'updates' ? (
          <UpdatesPage />
        ) : (
          <StaticPage page={page} navTo={navTo} />
        )}
      </main>

      {(currentPlatform === 'android' || currentPlatform === 'ios') && (
        <nav className={currentPlatform === 'ios' ? 'ios-tabbar' : 'android-bottom-nav'} aria-label={`${currentPlatform} bottom navigation`}>
          {bottomNavItems.map(item => (
            <button key={item.id} className={navItemActive(item.id) ? (currentPlatform === 'ios' ? 'ios-tab-active' : 'android-nav-active') : ''} onClick={() => runNavItem(item.id)}>
              <span>{item.emoji}</span>
              <small>{item.label}</small>
              {item.badge && <i />}
            </button>
          ))}
        </nav>
      )}
      {toastText && <div className="toast-container"><span>{toastText}</span></div>}
    </div>
  )
}

function DailyPage({ quotes, navTo, onFav, onSave, favorites, triggerToast }) {
  const lead = quotes[0]
  const [g1, g2] = gradients[lead.category] || ['#667EEA', '#764BA2']
  const copy = (text) => {
    copyText(text).then(ok => {
      if (ok) triggerToast('Quote copied to clipboard! 📋')
    })
  }
  return (
    <div className="static-page daily-page">
      <div className="static-card daily-card" style={{ background: `linear-gradient(145deg, ${g1}22, ${g2}22)` }}>
        <p className="daily-kicker">☀️ Quote of the Day</p>
        <h1>Today’s 5 Inspirations</h1>
        <div className="daily-grid">
          {quotes.map((quote, i) => {
            const isFav = favorites.includes(quote.text)
            return (
              <article className={i === 0 ? 'daily-quote-card daily-quote-card-lead' : 'daily-quote-card'} key={quote.text}>
                <p className="daily-quote">“{quote.text}”</p>
                <p className="daily-author">— {quote.author}</p>
                <p className="daily-cat">{categories[quote.category]?.emoji} {categories[quote.category]?.label}</p>
                <div className="daily-actions">
                  <button className="cta-btn" onClick={() => onFav(quote)}>{isFav ? '❤️ Liked' : '🤍 Like'}</button>
                  <button className="cta-btn cta-secondary" onClick={() => copy(quote.text)}>📋 Copy</button>
                  <button className="cta-btn cta-secondary" onClick={() => onSave(quote)}>💾 Save</button>
                  <button className="cta-btn cta-secondary" onClick={() => downloadQuoteImage(quote)}>🖼️ Image</button>
                </div>
              </article>
            )
          })}
        </div>
        <button className="cta-btn daily-explore" onClick={() => navTo('quotes')}>Explore all</button>
      </div>
    </div>
  )
}

function formatBuildLabel(value) {
  const raw = String(value || '')
  const parts = raw.split('-')
  if (parts.length >= 3 && parts[1].length > 10) return `${parts[0]}-${parts[1].slice(0, 7)}-${parts.slice(2).join('-')}`
  return raw.length > 28 ? `${raw.slice(0, 24)}...` : raw
}

function cleanReleaseNotes(body = '') {
  const lines = String(body || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  const notes = []
  for (const line of lines) {
    if (line.startsWith('|')) continue
    if (/^-{3,}$/.test(line)) continue
    if (/^#+\s*/.test(line)) continue
    if (/^\*\*Commit:\*\*/i.test(line)) continue
    if (/^\*\*Workflow run:\*\*/i.test(line)) continue
    if (/^\*\*Full Changelog\*\*/i.test(line)) continue
    if (/Download platform-specific/i.test(line)) continue
    const cleaned = line
      .replace(/^\*\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
    if (cleaned && !notes.includes(cleaned)) notes.push(cleaned)
  }

  const friendly = notes.filter(note => !/Platform|Artifact|Included builds/i.test(note))
  return friendly.length > 0 ? friendly : [
    'Multi-platform app package is ready.',
    'Windows, macOS, Linux, Android, iOS, and Web builds were prepared.',
    'Open the recommended download for this device.',
  ]
}

function parseAiQuotes(raw, max = 10) {
  const cleaned = String(raw || '').replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    const arr = Array.isArray(parsed) ? parsed : parsed.quotes
    if (Array.isArray(arr)) return arr.map(item => typeof item === 'string' ? item : item.text).filter(Boolean).slice(0, max)
  } catch {}
  return cleaned
    .split(/\n+/)
    .map(line => line.replace(/^\s*[-*\d.)"]+\s*/, '').replace(/"$/,'').trim())
    .filter(line => line.length > 8)
    .slice(0, max)
}

async function callAiProvider(provider, config, prompt) {
  const key = config?.apiKey?.trim()
  const model = config?.model?.trim() || AI_PROVIDERS[provider]?.defaultModel
  if (!key) throw new Error(`Please add ${AI_PROVIDERS[provider]?.label || provider} API key first.`)

  if (provider === 'gemini') {
    const modelsToTry = [...new Set([model, 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'])]
    let lastStatus = ''
    for (const geminiModel of modelsToTry) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      })
      if (res.status === 404) {
        lastStatus = '404'
        continue
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Gemini error ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`)
      }
      const json = await res.json()
      return json.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || ''
    }
    throw new Error(`Gemini error ${lastStatus || 'model not available'}. Try gemini-2.0-flash or check your API key.`)
  }

  const openAiLikeEndpoints = {
    openai: 'https://api.openai.com/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    mistral: 'https://api.mistral.ai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
  }

  if (openAiLikeEndpoints[provider]) {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/OrbitSyncAI/InspireApp'
      headers['X-Title'] = 'InspireApp'
    }
    const res = await fetch(openAiLikeEndpoints[provider], {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.8 }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${AI_PROVIDERS[provider]?.label || provider} error ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`)
    }
    const json = await res.json()
    return json.choices?.[0]?.message?.content || ''
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) throw new Error(`Claude error ${res.status}`)
    const json = await res.json()
    return json.content?.map(part => part.text).join('\n') || ''
  }
  throw new Error('Unknown AI provider')
}

function AiQuotesPage({ settings, setSettings, savedQuotes, setSavedQuotes, onFav, favorites, triggerToast }) {
  const [provider, setProvider] = useState(settings.defaultProvider)
  const [language, setLanguage] = useState('Hindi')
  const [idea, setIdea] = useState('')
  const [maxQuotes, setMaxQuotes] = useState(5)
  const [generated, setGenerated] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => { setProvider(settings.defaultProvider) }, [settings.defaultProvider])

  const updateProvider = (key, patch) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [key]: { ...prev.providers[key], ...patch },
      },
    }))
  }

  const saveSettings = () => {
    try {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings))
      setSavedMessage('AI settings saved on this device.')
      setTimeout(() => setSavedMessage(''), 1800)
    } catch {
      setSavedMessage('Could not save AI settings on this device.')
    }
  }

  const generate = async () => {
    setBusy(true)
    setError('')
    try {
      const config = settings.providers[provider]
      const seed = Math.random().toString(36).substring(7)
      const prompt = `[Seed: ${seed}] Generate exactly ${maxQuotes} original, inspiring, detailed, and high-quality quotes in ${language}. Topic/idea/user requirements: ${idea || 'motivation and life growth'}. If the user asked for a specific length or size, follow it exactly. Make them detailed and substantial, not too short. Ensure they are unique and randomized. Return only a JSON array of strings, no explanation. Output format: ["quote 1", "quote 2", ...]`
      const raw = await callAiProvider(provider, config, prompt)
      const quotes = parseAiQuotes(raw, maxQuotes).map(text => ({ text, author: 'AI', provider }))
      setGenerated(quotes)
    } catch (e) {
      setError(e.message || 'AI quote generation failed')
    } finally {
      setBusy(false)
    }
  }

  const copy = (text) => {
    copyText(text).then(ok => {
      if (ok) triggerToast('Quote copied to clipboard! 📋')
    })
  }

  const saveQuote = (quote) => {
    const exists = savedQuotes.some(q => q.text === quote.text)
    if (exists) {
      triggerToast('Already saved! 💾')
      return
    }
    setSavedQuotes(prev => [{ ...quote, savedAt: new Date().toISOString() }, ...prev])
    triggerToast('Quote saved successfully! 💾')
  }

  return (
    <div className="static-page">
      <div className="static-card static-wide ai-page">
        <h1>🤖 AI Quotes</h1>
        <p>Choose your default AI, add API keys on this device, select a language, then generate quotes. Saved AI quotes stay inside this app.</p>

        <section className="ai-section">
          <h2>AI API Settings</h2>
          <div className="ai-default-row">
            <label>Default AI</label>
            <select value={settings.defaultProvider} onChange={e => setSettings(prev => ({ ...prev, defaultProvider: e.target.value }))}>
              {Object.entries(AI_PROVIDERS).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
          </div>
          <div className="ai-provider-grid">
            {Object.entries(AI_PROVIDERS).map(([key, meta]) => (
              <div key={key} className="ai-provider-card">
                <strong>{meta.label}</strong>
                <input type="password" placeholder={`${meta.label} API key`} value={settings.providers[key]?.apiKey || ''} onChange={e => updateProvider(key, { apiKey: e.target.value })} />
                <select value={settings.providers[key]?.model || meta.defaultModel} onChange={e => updateProvider(key, { model: e.target.value })}>
                  {meta.models.map(modelName => <option key={modelName} value={modelName}>{modelName}</option>)}
                </select>
                <input placeholder="Model" value={settings.providers[key]?.model || meta.defaultModel} onChange={e => updateProvider(key, { model: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="ai-save-row">
            <button className="cta-btn" onClick={saveSettings}>Save AI Settings</button>
            {savedMessage && <span>{savedMessage}</span>}
          </div>
        </section>

        <section className="ai-section">
          <h2>{AI_PROVIDERS[provider]?.label} Quote Generator</h2>
          <div className="ai-chatbox">
            <div className="ai-chatbar">
              <select value={provider} onChange={e => setProvider(e.target.value)}>
                {Object.entries(AI_PROVIDERS).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
              <select value={language} onChange={e => setLanguage(e.target.value)}>
                {AI_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
              <select value={maxQuotes} onChange={e => setMaxQuotes(Number(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} Quotes</option>)}
              </select>
            </div>
            <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={4} placeholder="Write your idea, topic, mood, or audience..." />
            <button className="cta-btn" disabled={busy} onClick={generate}>{busy ? 'Generating...' : `Generate Top ${maxQuotes} Quotes`}</button>
            {error && <p className="ai-error">{error}</p>}
          </div>

          <div className="ai-results">
            {generated.map((quote, i) => {
              const liked = favorites.includes(quote.text)
              return (
                <article key={`${quote.text}-${i}`} className="ai-quote-card">
                  <p>{quote.text}</p>
                  <small>— AI · {AI_PROVIDERS[quote.provider]?.label}</small>
                  <div className="ai-actions">
                    <button onClick={() => onFav(quote)}>{liked ? '❤️ Liked' : '🤍 Like'}</button>
                    <button onClick={() => saveQuote(quote)}>Save</button>
                    <button onClick={() => copy(quote.text)}>Copy</button>
                    <button onClick={() => downloadQuoteImage(quote, 'AI Quote')}>Image</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function SavedQuotesPage({ quotes, setQuotes, onFav, favorites, triggerToast }) {
  const copy = (text) => {
    copyText(text).then(ok => {
      if (ok) triggerToast('Quote copied to clipboard! 📋')
    })
  }

  const removeQuote = (i) => {
    setQuotes(prev => prev.filter((_, idx) => idx !== i))
    triggerToast('Removed from Saved Quotes 🗑️')
  }

  return (
    <div className="static-page">
      <div className="static-card static-wide">
        <h1>💾 Saved Quotes</h1>
        <p>Your saved quotes are stored locally on this device.</p>
        <div className="list-container list-wide">
          {quotes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>No saved quotes yet.</p>
          ) : (
            quotes.map((q, i) => {
              const isFav = favorites.includes(q.text)
              return (
                <div key={i} className="list-card">
                  <div className="list-card-top">
                    <span className="list-num">{i + 1}</span>
                    <div className="list-actions">
                      <button className="list-action-btn" onClick={() => onFav(q)} title={isFav ? 'Unlike' : 'Like'}>
                        {isFav ? '❤️' : '🤍'}
                      </button>
                      <button className="list-action-btn" onClick={() => copy(q.text)} title="Copy">📋</button>
                      <button className="list-action-btn" onClick={() => removeQuote(i)} title="Remove">🗑️</button>
                      <button className="list-action-btn" onClick={() => downloadQuoteImage(q, q.author || 'Saved')} title="Download image">🖼️</button>
                    </div>
                  </div>
                  <p className="list-quote-text">{q.text}</p>
                  <p className="list-quote-author">— {q.author || 'AI'}</p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

async function notifyUpdateAvailable(result) {
  if (!result?.hasUpdate || typeof window === 'undefined' || !('Notification' in window)) return
  try {
    let permission = Notification.permission
    if (permission === 'default') permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    new Notification('InspireApp update available', {
      body: `Version ${result.latestVersion} is ready for ${platformLabel(result.platform)}.`,
      tag: `inspire-update-${result.latestVersion}`,
    })
  } catch {}
}

function UpdatesPage() {
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pendingUpdate, setPendingUpdate] = useState(null)
  const [updateNotice, setUpdateNotice] = useState('')
  const platform = detectPlatform()

  const runCheck = async () => {
    setStatus('loading')
    setError('')
    try {
      const r = await checkForUpdates()
      setResult(r)
      setStatus('done')
      notifyUpdateAvailable(r)
    } catch (e) {
      setError(e.message || 'Update check failed')
      setStatus('error')
    }
  }

  return (
    <div className="static-page">
      <div className="static-card updates-card">
        <h1>🔄 App Updates</h1>
        <p>Updates are checked only when you tap the button below. The app will not look for releases or show update details automatically.</p>

        <div className="version-box">
          <div>
            <span className="vb-label">Installed version</span>
            <strong className="vb-value">v{APP_VERSION}</strong>
          </div>
          <div>
            <span className="vb-label">Build</span>
            <strong className="vb-value">{formatBuildLabel(APP_BUILD)}</strong>
          </div>
          <div>
            <span className="vb-label">This device</span>
            <strong className="vb-value">{platformLabel(platform)}</strong>
          </div>
          {result?.latestVersion && (
            <div>
              <span className="vb-label">Latest on GitHub</span>
              <strong className={'vb-value' + (result.hasUpdate ? ' vb-new' : '')}>v{result.latestVersion}</strong>
            </div>
          )}
        </div>

        <div className="update-actions">
          <button className="cta-btn update-check-btn" onClick={runCheck} disabled={status === 'loading'}>
            {status === 'loading' ? 'Checking…' : '🔄 Check for Updates'}
          </button>
        </div>

        {status === 'idle' && (
          <div className="update-alert update-ok">
            <p><strong>Manual update check is ready.</strong></p>
            <p>Tap <strong>Check for Updates</strong> when you want to look for a new release. No automatic check runs in the background.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="update-alert update-error">
            <p><strong>Could not check updates.</strong> {error}</p>
            <p>Make sure you are online. You can also open releases manually:</p>
            <a className="phone-link" href={RELEASES_PAGE} target="_blank" rel="noreferrer">Open GitHub Releases</a>
          </div>
        )}
        {updateNotice && (
          <div className="update-alert update-ok">
            <p><strong>{updateNotice}</strong></p>
            <p>If Android asks permission to install unknown apps, allow InspireApp once and continue the update.</p>
          </div>
        )}

        {status === 'done' && result && (
          <div className={'update-alert ' + (result.hasUpdate ? 'update-available' : 'update-ok')}>
            <p><strong>{result.hasUpdate ? '🎉 Update available!' : '✅ You are up to date'}</strong></p>
            <p>{result.message}</p>

            {result.hasUpdate && result.release && (
              <>
                <h2>What’s new — {result.release.name || result.release.tag}</h2>
                <ul className="release-notes-list">
                  {cleanReleaseNotes(result.release.body).map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
                <p className="muted-date">Published: {result.release.publishedAt ? new Date(result.release.publishedAt).toLocaleString() : '—'}</p>

                <div className="download-box">
                  <p>Open release details on GitHub for <strong>{platformLabel(result.platform)}</strong>:</p>
                  <a className="cta-btn" href={result.release?.htmlUrl || RELEASES_PAGE} target="_blank" rel="noreferrer">
                    🌐 Open GitHub Releases Page
                  </a>
                  <p className="small-note">This will open your browser and redirect you to the official releases page where you can view all assets for this version.</p>
                </div>
              </>
            )}

            {!result.hasUpdate && (
              <p className="small-note">When you publish a new GitHub Release (after compile), open this page again and tap Check for Updates on any device.</p>
            )}
          </div>
        )}

        <h2>How updates work (all devices)</h2>
        <ol className="steps-list">
          <li>You push code and run the multi-platform build pipeline.</li>
          <li>A GitHub Release is created with Windows / macOS / Linux / Android / iOS files.</li>
          <li>Users open <strong>Updates</strong> → <strong>Check for Updates</strong>.</li>
          <li>The app shows the new <strong>version number</strong>, clean release notes, and redirects to the browser to get the installer for that device.</li>
          <li>Install the downloaded build for your operating system.</li>
          <li>After installing the new build, reopen the app and the installed version shown here changes.</li>
        </ol>
        <a className="phone-link" href={RELEASES_PAGE} target="_blank" rel="noreferrer">Browse all releases →</a>
      </div>
    </div>
  )
}

function StaticPage({ page, navTo }) {
  const data = staticPages[page]
  if (!data) {
    return (
      <div className="static-page">
        <div className="static-card">
          <h1>Page not found</h1>
          <button className="cta-btn" onClick={() => navTo('quotes')}>Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="static-page">
      <div className="static-card static-wide">
        <h1>{data.emoji} {data.title}</h1>
        {data.sections.map((sec, i) => (
          <section key={i} className="static-section">
            <h2>{sec.heading}</h2>
            {sec.body.map((p, j) => <p key={j}>{p}</p>)}
            {sec.phone && (
              <div className="contact-card">
                <span className="contact-icon">📞</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>Call / WhatsApp</p>
                  <a href={'tel:' + sec.phone} className="phone-link">{sec.phoneDisplay || sec.phone}</a>
                </div>
              </div>
            )}
          </section>
        ))}
        <button className="cta-btn" onClick={() => navTo('quotes')}>Back to Quotes</button>
      </div>
    </div>
  )
}
