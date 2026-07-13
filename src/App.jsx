import { useState, useCallback, useEffect, useReducer, useMemo, useRef } from 'react'
import { categories, gradients, allQuotes, currentYear } from './data'
import { staticPages } from './pagesContent'
import { APP_NAME, APP_VERSION, APP_BUILD, RELEASES_PAGE, detectPlatform, platformLabel, SUPABASE_URL, SUPABASE_ANON_KEY } from './version'
import { checkForUpdates } from './updateService'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)


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
  const [clickCount, setClickCount] = useState(0)

  const handleVersionClick = () => {
    setClickCount(c => {
      if (c + 1 >= 5) {
        setPage('admin')
        setMenuOpen(false)
        triggerToast('Welcome to Admin Portal! 🔐')
        return 0
      }
      return c + 1
    })
  }


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
    { id: 'admin', label: 'Admin Panel', emoji: '🔐' },
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
        <div className="oc-version-bottom" onClick={handleVersionClick} style={{ cursor: 'pointer' }}>
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
        ) : page === 'admin' ? (
          <AdminPanelPage navTo={navTo} triggerToast={triggerToast} />
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
  let model = config?.model?.trim() || AI_PROVIDERS[provider]?.defaultModel

  console.log(`[Supabase RPC] Invoking generate_ai_quote for provider: ${provider}`);
  const { data, error } = await supabase.rpc('generate_ai_quote', {
    provider,
    model,
    prompt
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.success === false) {
    throw new Error(data.error || 'AI generation failed');
  }

  return data.text;
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
      const prompt = `[Seed: ${seed}] Generate original, inspiring, detailed, and high-quality quotes in ${language}. Topic/idea/user requirements: ${idea || 'motivation and life growth'}. If the user asked for a specific number of quotes in their prompt, generate exactly that amount. Otherwise, generate exactly 5 quotes. Return only a JSON array of strings, no explanation. Output format: ["quote 1", "quote 2", ...]`
      const raw = await callAiProvider(provider, config, prompt)
      const quotes = parseAiQuotes(raw, 10).map(text => ({ text, author: 'AI', provider }))
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
        <p>Select a language, write your topic or mood, then generate custom quotes instantly.</p>

        <section className="ai-section">
          <h2>AI Quote Generator</h2>
          <div className="ai-chatbox">
            <div className="ai-chatbar">
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
                {AI_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={4} placeholder="Write your idea, topic, mood, or audience. E.g. 'Generate 3 high quality quotes about patience'..." />
            <button className="cta-btn" disabled={busy} onClick={generate}>{busy ? 'Generating...' : 'Generate Now'}</button>
            {error && <p className="ai-error">{error}</p>}
          </div>

          <div className="ai-results">
            {generated.map((quote, i) => {
              const liked = favorites.includes(quote.text)
              return (
                <article key={`${quote.text}-${i}`} className="ai-quote-card">
                  <p>{quote.text}</p>
                  <small>— AI</small>
                  <div className="ai-actions">
                    <button onClick={() => onFav(quote)}>{liked ? '❤️ Liked' : '🤍 Like'}</button>
                    <button onClick={() => saveQuote(quote)}>Save</button>
                    <button onClick={() => copy(quote.text)}>Copy</button>
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

                 {result.asset ? (
                  <div className="download-box">
                    <p>Recommended for <strong>{platformLabel(result.platform)}</strong>:</p>
                    <button className="cta-btn" onClick={() => setPendingUpdate(result)}>
                      ⬇️ Download v{result.latestVersion}
                    </button>
                    <p className="small-note">This opens the matching GitHub asset for your device, such as Android APK on Android and Windows installer on Windows.</p>
                  </div>
                ) : (
                  <div className="download-box">
                    <p>No direct installer matched this device automatically.</p>
                    <a className="cta-btn" href={result.release.htmlUrl || RELEASES_PAGE} target="_blank" rel="noreferrer">Open release page</a>
                  </div>
                )}
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
          <li>The app shows the new <strong>version number</strong>, clean release notes, and one recommended update action for that device.</li>
          <li>Android downloads inside the app and then opens the system install prompt. Other operating systems may still hand off the final install to their native installer.</li>
          <li>After installing the new build, reopen the app and the installed version shown here changes.</li>
        </ol>
        <a className="phone-link" href={RELEASES_PAGE} target="_blank" rel="noreferrer">Browse all releases →</a>
      </div>
      {pendingUpdate?.asset && (
        <div className="update-modal-backdrop" onClick={() => setPendingUpdate(null)}>
          <div className="update-modal" onClick={e => e.stopPropagation()}>
            <h2>Update to v{pendingUpdate.latestVersion}</h2>
            <p>InspireApp selected the recommended GitHub download for <strong>{platformLabel(pendingUpdate.platform)}</strong>. Android gets the APK, Windows gets the installer, macOS gets the zip, and Linux gets the AppImage.</p>
            <div className="update-modal-actions">
              <button className="cta-btn cta-secondary" onClick={() => setPendingUpdate(null)}>Cancel</button>
              <a
                className="cta-btn"
                href={pendingUpdate.asset.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  setUpdateNotice(`GitHub download opened for v${pendingUpdate.latestVersion}.`)
                  setPendingUpdate(null)
                }}
              >Open GitHub Download v{pendingUpdate.latestVersion}</a>
            </div>
          </div>
        </div>
      )}
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

function AdminPanelPage({ navTo, triggerToast }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inspire-admin-session')) } catch { return null }
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);

  // Forgot Password States
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Select Method, 2 = Enter OTP, 3 = Reset Password
  const [recoveryMethod, setRecoveryMethod] = useState('primary_email');
  const [otpInput, setOtpInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Diagnostic Logs Terminal State
  const [diagnosticLogs, setDiagnosticLogs] = useState([
    `[${new Date().toLocaleTimeString()}] System ready. Press "Run Diagnostic" to test key connectivity.`
  ]);
  const [latency, setLatency] = useState(null);

  // Dashboard Configuration States
  const [activeTab, setActiveTab] = useState('gemini');
  const [config, setConfig] = useState({
    defaultProvider: 'gemini',
    gemini: { defaultModel: 'gemini-3.1-flash-lite', activeKey: '', keys: [] },
    openai: { defaultModel: 'gpt-4o-mini', activeKey: '', keys: [] },
    openrouter: { defaultModel: 'openai/gpt-4o-mini', activeKey: '', keys: [] }
  });
  
  // Custom Local Key management inputs
  const [newFallbackKey, setNewFallbackKey] = useState('');

  // Profile management states
  const [profile, setProfile] = useState({
    username: '',
    primaryEmail: '',
    recoveryEmail: '',
    primaryPhone: '',
    recoveryPhone: ''
  });
  
  const [editUsername, setEditUsername] = useState('');
  const [editPrimaryEmail, setEditPrimaryEmail] = useState('');
  const [editRecoveryEmail, setEditRecoveryEmail] = useState('');
  const [editPrimaryPhone, setEditPrimaryPhone] = useState('');
  const [editRecoveryPhone, setEditRecoveryPhone] = useState('');
  const [newProfilePassword, setNewProfilePassword] = useState('');

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('api_config')
        .select('*')
        .eq('id', 'config')
        .single();
      
      if (error) throw error;
      if (data) {
        setConfig({
          defaultProvider: data.default_provider || 'gemini',
          gemini: data.gemini || { defaultModel: 'gemini-3.1-flash-lite', activeKey: '', keys: [] },
          openai: data.openai || { defaultModel: 'gpt-4o-mini', activeKey: '', keys: [] },
          openrouter: data.openrouter || { defaultModel: 'openai/gpt-4o-mini', activeKey: '', keys: [] }
        });
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error loading config. Ensure setup-supabase.sql was run.');
    }
  }, [triggerToast]);

  // Fetch admin profile
  const fetchProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profile')
        .select('*')
        .eq('id', 'profile')
        .single();
      
      if (error) throw error;
      if (data) {
        const loaded = {
          username: data.username || '',
          primaryEmail: data.primary_email || '',
          recoveryEmail: data.recovery_email || '',
          primaryPhone: data.primary_phone || '',
          recoveryPhone: data.recovery_phone || ''
        };
        setProfile(loaded);
        setEditUsername(loaded.username);
        setEditPrimaryEmail(loaded.primaryEmail);
        setEditRecoveryEmail(loaded.recoveryEmail);
        setEditPrimaryPhone(loaded.primaryPhone);
        setEditRecoveryPhone(loaded.recoveryPhone);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchConfig();
      fetchProfile();
    }
  }, [session, fetchConfig, fetchProfile]);

  const addLog = (msg) => {
    setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Run AI Key Diagnostic test
  const runKeyDiagnostic = async (provider) => {
    addLog(`Initiating connection diagnostic for: ${provider.toUpperCase()}...`);
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.rpc('generate_ai_quote', {
        provider,
        model: '',
        prompt: 'SUCCESS'
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      setLatency(duration);

      if (error) throw error;

      if (data && data.success === true) {
        addLog(`✅ DIAGNOSTIC PASS: Connection successful!`);
        addLog(`⏱️ Database Latency: ${duration} seconds.`);
        addLog(`💬 Response text: "${data.text.trim()}"`);
        triggerToast('Key Diagnostic Passed! ✅');
      } else {
        throw new Error(data.error || 'Unknown error response from database');
      }
    } catch (err) {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      addLog(`❌ DIAGNOSTIC FAIL: ${err.message || err}`);
      addLog(`⏱️ Time elapsed: ${duration} seconds.`);
      triggerToast('Key Diagnostic Failed! ❌');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usernameInput || !password) return;
    setBusy(true);
    setLoginError('');
    try {
      // Authenticate via database function
      const { data, error } = await supabase.rpc('admin_authenticate', {
        input_username: usernameInput.trim()
      });

      if (error) throw error;

      if (data && data.success === true) {
        // Compare password hash using client side bcrypt
        const matched = bcrypt.compareSync(password, data.password_hash);
        if (matched) {
          const userSession = { username: usernameInput.trim(), authenticated: true };
          localStorage.setItem('inspire-admin-session', JSON.stringify(userSession));
          setSession(userSession);
          triggerToast('Logged in as administrator! 🔑');
        } else {
          throw new Error('Invalid username or password.');
        }
      } else {
        throw new Error('Invalid username or password.');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('inspire-admin-session');
    setSession(null);
    setUsernameInput('');
    setPassword('');
    setForgotMode(false);
    setForgotStep(1);
    setForgotError('');
    setForgotMessage('');
    triggerToast('Logged out! 🔒');
  };

  // Forgot password flows
  const triggerForgotPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setForgotError('');
    setForgotMessage('');
    try {
      const { data, error } = await supabase.rpc('request_recovery_otp', {
        target_method: recoveryMethod
      });
      if (error) throw error;
      if (data && data.success === true) {
        setForgotMessage(`Verification code sent to destination ending in: "${data.destination_masked}". (Debug OTP: ${data.otp_debug})`);
        setForgotStep(2);
      } else {
        throw new Error(data.error || 'Failed to request OTP');
      }
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput) return;
    setBusy(true);
    setForgotError('');
    setForgotMessage('');
    try {
      const { data, error } = await supabase.rpc('verify_recovery_otp', {
        target_method: recoveryMethod,
        entered_otp: otpInput.trim()
      });
      if (error) throw error;
      if (data && data.success === true) {
        setResetToken(data.reset_token);
        setForgotStep(3);
        setForgotMessage('OTP verified! Enter your new password below.');
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!newPassInput) return;
    setBusy(true);
    setForgotError('');
    setForgotMessage('');
    try {
      const hashed = bcrypt.hashSync(newPassInput, 10);
      const { data, error } = await supabase.rpc('reset_admin_password', {
        reset_secret: resetToken,
        new_password_hash: hashed
      });

      if (error) throw error;
      if (data && data.success === true) {
        triggerToast('Password reset successfully! 🔑');
        setForgotMode(false);
        setForgotStep(1);
        setOtpInput('');
        setNewPassInput('');
        setResetToken('');
      } else {
        throw new Error(data.error || 'Reset failed');
      }
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Keys Save Handler
  const saveProviderKeys = async (provider) => {
    setBusy(true);
    try {
      const providerData = config[provider];
      const { error } = await supabase
        .from('api_config')
        .upsert({
          id: 'config',
          default_provider: config.defaultProvider,
          [provider]: {
            defaultModel: providerData.defaultModel,
            activeKey: providerData.activeKey,
            keys: providerData.keys
          },
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      triggerToast(`${provider.toUpperCase()} keys saved to database! 💾`);
      fetchConfig();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Default provider save
  const saveDefaultProvider = async (provider) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('api_config')
        .upsert({
          id: 'config',
          default_provider: provider,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setConfig(prev => ({ ...prev, defaultProvider: provider }));
      triggerToast(`Default AI provider set to ${provider.toUpperCase()}! 🤖`);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Profile save handler
  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updates = {
        id: 'profile',
        username: editUsername.trim() || profile.username,
        primary_email: editPrimaryEmail.trim() || profile.primaryEmail,
        recovery_email: editRecoveryEmail.trim(),
        primary_phone: editPrimaryPhone.trim(),
        recovery_phone: editRecoveryPhone.trim(),
        updated_at: new Date().toISOString()
      };

      if (newProfilePassword) {
        updates.password_hash = bcrypt.hashSync(newProfilePassword, 10);
      }

      const { error } = await supabase
        .from('admin_profile')
        .upsert(updates);

      if (error) throw error;

      triggerToast('Profile updated successfully! 👤');
      setNewProfilePassword('');
      fetchProfile();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Fallback key management operations
  const addFallbackKey = (provider) => {
    if (!newFallbackKey) return;
    setConfig(prev => {
      const providerData = prev[provider] || { keys: [] };
      const currentKeys = providerData.keys || [];
      if (currentKeys.includes(newFallbackKey)) return prev;
      return {
        ...prev,
        [provider]: {
          ...providerData,
          keys: [...currentKeys, newFallbackKey]
        }
      };
    });
    setNewFallbackKey('');
  };

  const removeFallbackKey = (provider, index) => {
    setConfig(prev => {
      const providerData = prev[provider];
      return {
        ...prev,
        [provider]: {
          ...providerData,
          keys: providerData.keys.filter((_, idx) => idx !== index)
        }
      };
    });
  };

  if (!session) {
    return (
      <div className="static-page">
        <div className="static-card admin-auth-card">
          <h1>🔐 Admin Portal</h1>
          <p>Login to securely configure API keys, models, and recovery settings on your database.</p>

          {!forgotMode ? (
            <form onSubmit={handleLogin} className="admin-form">
              <div className="form-group">
                <label>Admin Username</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  placeholder="Enter admin username (e.g. Sohel)"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
              </div>
              {loginError && <p className="form-error">{loginError}</p>}
              <div className="form-actions">
                <button type="submit" className="cta-btn" disabled={busy}>
                  {busy ? 'Authenticating...' : 'Login Securely'}
                </button>
                <button
                  type="button"
                  className="cta-btn cta-secondary"
                  onClick={() => {
                    setForgotMode(true);
                    setForgotError('');
                    setForgotMessage('');
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          ) : (
            <div className="admin-forgot-flow">
              <h3>Reset Admin Password</h3>
              {forgotError && <p className="form-error">{forgotError}</p>}
              {forgotMessage && <p className="form-success">{forgotMessage}</p>}

              {forgotStep === 1 && (
                <form onSubmit={triggerForgotPassword} className="admin-form">
                  <p className="step-note">Select your preferred destination channel to receive a 6-digit verification OTP.</p>
                  
                  <div className="form-group">
                    <label>Select Recovery Option</label>
                    <select
                      value={recoveryMethod}
                      onChange={e => setRecoveryMethod(e.target.value)}
                    >
                      <option value="primary_email">Primary Email (larsonsteve48@gmail.com)</option>
                      <option value="backup_email">Backup Email</option>
                      <option value="primary_phone">Primary Phone (9026053036)</option>
                      <option value="backup_phone">Backup Phone Number</option>
                    </select>
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="cta-btn" disabled={busy}>
                      {busy ? 'Requesting...' : 'Request Verification OTP'}
                    </button>
                    <button type="button" className="cta-btn cta-secondary" onClick={() => setForgotMode(false)}>
                      Back to Login
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={verifyOtp} className="admin-form">
                  <p className="step-note">A 6-digit OTP code has been logged. Enter it below to authorize credential resetting.</p>
                  <div className="form-group">
                    <label>Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={e => setOtpInput(e.target.value)}
                      placeholder="Enter OTP code"
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="cta-btn" disabled={busy}>
                      {busy ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button type="button" className="cta-btn cta-secondary" onClick={() => setForgotStep(1)}>
                      Back
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 3 && (
                <form onSubmit={resetPassword} className="admin-form">
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassInput}
                      onChange={e => setNewPassInput(e.target.value)}
                      placeholder="Enter your new password"
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="cta-btn" disabled={busy}>
                      {busy ? 'Saving...' : 'Reset Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <button className="cta-btn cta-secondary" style={{ marginTop: '20px', width: '100%' }} onClick={() => navTo('quotes')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="static-page">
      <div className="static-card static-wide admin-dashboard">
        <div className="dashboard-header">
          <h1>🔐 Admin Dashboard</h1>
          <button className="cta-btn cta-secondary logout-btn" onClick={handleLogout}>
            Logout 🔒
          </button>
        </div>
        
        {/* Diagnostic latency widget */}
        <div className="diagnostic-summary-grid">
          <div className="stat-summary-card">
            <span className="stat-label">Database Sync</span>
            <span className="stat-value text-green">ONLINE ✅</span>
          </div>
          <div className="stat-summary-card">
            <span className="stat-label">AI Diagnostic Test</span>
            <button className="run-diag-btn" onClick={() => runKeyDiagnostic(activeTab)}>
              ⚡ Run Diagnostic
            </button>
          </div>
          <div className="stat-summary-card">
            <span className="stat-label">Key Status Latency</span>
            <span className="stat-value">{latency ? `${latency}s` : '--'}</span>
          </div>
        </div>

        {/* Diagnostic Logs Terminal Screen */}
        <div className="diagnostic-console">
          <h3>⚡ Connection Diagnostic Console</h3>
          <div className="console-terminal">
            {diagnosticLogs.map((log, idx) => (
              <div key={idx} className="terminal-line">{log}</div>
            ))}
          </div>
        </div>

        <div className="dashboard-layout">
          {/* Left Side: Keys Configuration */}
          <div className="dashboard-column">
            <div className="dash-card">
              <h2>🔑 API Key Manager</h2>
              
              <div className="form-group">
                <label>Default AI Provider</label>
                <select
                  value={config.defaultProvider}
                  onChange={e => saveDefaultProvider(e.target.value)}
                >
                  <option value="gemini">Gemini (Google)</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>

              <div className="provider-tabs">
                {['gemini', 'openai', 'openrouter'].map(p => (
                  <button
                    key={p}
                    className={`tab-btn ${activeTab === p ? 'active' : ''}`}
                    onClick={() => { setActiveTab(p); setNewFallbackKey(''); }}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>

              {['gemini', 'openai', 'openrouter'].map(p => {
                if (activeTab !== p) return null;
                const pData = config[p] || { defaultModel: '', activeKey: '', keys: [] };

                return (
                  <div key={p} className="tab-content">
                    <div className="form-group">
                      <label>Default Model</label>
                      <input
                        type="text"
                        value={pData.defaultModel || ''}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          [p]: { ...prev[p], defaultModel: e.target.value }
                        }))}
                        placeholder="e.g. gemini-3.1-flash-lite"
                      />
                    </div>

                    <div className="form-group">
                      <label>Active / Primary Key</label>
                      <input
                        type="password"
                        value={pData.activeKey || ''}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          [p]: { ...prev[p], activeKey: e.target.value }
                        }))}
                        placeholder="Enter primary API key"
                      />
                    </div>

                    <div className="form-group">
                      <label>Fallback Keys List</label>
                      <div className="fallback-list">
                        {(pData.keys || []).map((k, idx) => (
                          <div key={idx} className="fallback-item">
                            <span className="key-mask">
                              {k.length > 15 ? `${k.substring(0, 6)}...${k.substring(k.length - 4)}` : k}
                            </span>
                            <button
                              type="button"
                              className="remove-key-btn"
                              onClick={() => removeFallbackKey(p, idx)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="add-key-row">
                        <input
                          type="password"
                          value={newFallbackKey}
                          onChange={e => setNewFallbackKey(e.target.value)}
                          placeholder="Add fallback API key"
                        />
                        <button
                          type="button"
                          className="cta-btn"
                          onClick={() => addFallbackKey(p)}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="cta-btn save-keys-btn"
                      onClick={() => saveProviderKeys(p)}
                      disabled={busy}
                    >
                      Save {p.toUpperCase()} Config
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Profile Credentials */}
          <div className="dashboard-column">
            <div className="dash-card">
              <h2>👤 Profile & Security</h2>
              <form onSubmit={saveProfile} className="admin-form">
                <p className="step-note">Change your recovery details or account credentials. Leave fields blank to keep them unchanged.</p>

                <div className="form-group">
                  <label>Change Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    placeholder="Enter new username"
                  />
                </div>

                <div className="form-group">
                  <label>Primary Email</label>
                  <input
                    type="email"
                    value={editPrimaryEmail}
                    onChange={e => setEditPrimaryEmail(e.target.value)}
                    placeholder="Enter primary email"
                  />
                </div>

                <div className="form-group">
                  <label>Backup Email</label>
                  <input
                    type="email"
                    value={editRecoveryEmail}
                    onChange={e => setEditRecoveryEmail(e.target.value)}
                    placeholder="Enter backup email"
                  />
                </div>

                <div className="form-group">
                  <label>Primary Phone</label>
                  <input
                    type="text"
                    value={editPrimaryPhone}
                    onChange={e => setEditPrimaryPhone(e.target.value)}
                    placeholder="Enter primary phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Backup Phone</label>
                  <input
                    type="text"
                    value={editRecoveryPhone}
                    onChange={e => setEditRecoveryPhone(e.target.value)}
                    placeholder="Enter backup phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Change Password</label>
                  <input
                    type="password"
                    value={newProfilePassword}
                    onChange={e => setNewProfilePassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <button type="submit" className="cta-btn" disabled={busy}>
                  Update Profile Credentials
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


