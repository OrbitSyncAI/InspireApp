import { useState, useCallback, useEffect, useReducer, useMemo, useRef } from 'react'
import { categories, gradients, allQuotes, currentYear } from './data'
import { staticPages } from './pagesContent'
import { APP_NAME, APP_VERSION, APP_BUILD, RELEASES_PAGE, detectPlatform, platformLabel, SUPABASE_URL, SUPABASE_ANON_KEY } from './version'
import { checkForUpdates } from './updateService'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)


const tabKeys = Object.keys(categories).filter(k => k !== 'LIKED')
const PER_PAGE = 10
const AI_SETTINGS_KEY = 'inspire-ai-settings'
const AI_SAVED_KEY = 'inspire-ai-saved-quotes'
const AI_LIKED_KEY = 'inspire-ai-liked-quotes'
const AI_PROVIDERS = {
  gemini: { label: 'Gemini', defaultModel: 'gemini-3.1-flash-lite', models: ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-3.1-flash-lite', 'gemini-1.5-pro'] },
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
  const [page, setPage] = useState('home')
  const [tab, setTabState] = useState('MOTIVATION')
  const [index, setIndex] = useState(() => getSavedIndex('MOTIVATION'))
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
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false)
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
    setMobileCategoriesOpen(false)
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'auto' })
  }

  const navItems = [
    { id: 'quotes', label: 'Home', emoji: '🏠' },
    { id: 'daily', label: 'Daily', emoji: '☀️' },
    { id: 'liked', label: 'Liked Quotes', emoji: '❤️' },
    { id: 'ai', label: '✨ Inspire AI', emoji: '🤖' },
    { id: 'saved', label: 'Saved Quotes', emoji: '💾' },
    { id: 'about', label: 'About Us', emoji: 'ℹ️' },
    { id: 'contact', label: 'Contact', emoji: '📞' },
    { id: 'privacy', label: 'Privacy', emoji: '🔒' },
    { id: 'terms', label: 'Terms', emoji: '📜' },
    { id: 'disclaimer', label: 'Disclaimer', emoji: '⚠️' },
    { id: 'admin', label: 'Admin Panel', emoji: '🔐' },
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
                  <button className="mobile-category-toggle" onClick={() => setMobileCategoriesOpen(v => !v)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{categories[tab]?.emoji} {categories[tab]?.label || 'Categories'} {tab === 'LIKED' ? `(${favorites.length})` : ''}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: mobileCategoriesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
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

async function callAiResponse(prompt, mimeType = '', base64Data = '', history = []) {
  console.log(`[Supabase RPC] Invoking generate_ai_response`);
  // Build a context string from history (last 6 messages)
  const recentHistory = history.slice(-6);
  const contextPrefix = recentHistory.length > 0
    ? recentHistory.map(m => `${m.role === 'user' ? 'User' : 'Inspire AI'}: ${m.role === 'user' ? m.content : (m.type === 'quotes' ? m.quotes.map(q => q.text).join('; ') : m.content)}`).join('\n') + '\n\n'
    : '';
  const fullPrompt = contextPrefix ? `${contextPrefix}User: ${prompt}` : prompt;

  const { data, error } = await supabase.rpc('generate_ai_response', {
    prompt: fullPrompt,
    mime_type: mimeType,
    base64_data: base64Data
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.success === false) {
    throw new Error(data.error || 'AI generation failed');
  }

  return data.text;
}

// Markdown link renderer - opens links in new tab with copy option
function MarkdownLink({ href, children }) {
  const copy = () => {
    navigator.clipboard.writeText(href).catch(() => {})
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: 'var(--primary-color, #667EEA)', textDecoration: 'underline', wordBreak: 'break-all' }}>
        {children}
      </a>
      <button onClick={copy} title="Copy link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1 }}>
        📋
      </button>
    </span>
  )
}

const markdownComponents = {
  a: MarkdownLink,
  img: ({ src, alt }) => (
    <img src={src} alt={alt || 'image'} style={{ maxWidth: '100%', height: 'auto', borderRadius: '10px', margin: '10px 0', display: 'block' }} />
  ),
  pre: ({ children }) => (
    <pre style={{ background: 'rgba(0,0,0,0.06)', padding: '12px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.875rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0' }}>
      {children}
    </pre>
  ),
  code: ({ inline, children }) => inline
    ? <code style={{ background: 'rgba(0,0,0,0.07)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.875em', wordBreak: 'break-word' }}>{children}</code>
    : <>{children}</>,
  h1: ({ children }) => <h1 style={{ fontSize: '1.3rem', margin: '16px 0 8px', fontWeight: 700 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '1.15rem', margin: '14px 0 6px', fontWeight: 700 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '1.05rem', margin: '12px 0 4px', fontWeight: 600 }}>{children}</h3>,
  ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: '4px', lineHeight: 1.6 }}>{children}</li>,
  p: ({ children }) => <p style={{ margin: '6px 0', lineHeight: 1.7, wordBreak: 'break-word' }}>{children}</p>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid var(--primary-color, #667EEA)', paddingLeft: '12px', margin: '10px 0', opacity: 0.85, fontStyle: 'italic' }}>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '10px 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>{children}</table>
    </div>
  ),
  th: ({ children }) => <th style={{ border: '1px solid var(--static-border)', padding: '8px 12px', background: 'rgba(0,0,0,0.05)', textAlign: 'left' }}>{children}</th>,
  td: ({ children }) => <td style={{ border: '1px solid var(--static-border)', padding: '8px 12px' }}>{children}</td>,
}

function AiQuotesPage({ savedQuotes, setSavedQuotes, onFav, favorites, triggerToast }) {
  const [prompt, setPrompt] = useState('')
  const [attachedFile, setAttachedFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [chatHistory, setChatHistory] = useState([]) // [{role, content, type, quotes, file}]
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, busy])

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setAttachedFile(null); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedFile({
        name: file.name,
        type: file.type,
        base64: reader.result.split(',')[1],
        previewUrl: file.type.startsWith('image/') ? reader.result : null
      });
    };
    reader.readAsDataURL(file);
  };

  const clearAttachedFile = () => setAttachedFile(null);

  const generate = async () => {
    if (busy) return;
    const trimmedPrompt = prompt.trim();
    const isPromptEmpty = trimmedPrompt === '' && !attachedFile;
    setBusy(true);
    setError('');

    // Add user message to history (if they typed something or attached a file)
    let userMsg = null;
    if (!isPromptEmpty) {
      userMsg = {
        id: Date.now(),
        role: 'user',
        content: trimmedPrompt || `[Attached: ${attachedFile?.name}]`,
        file: attachedFile ? { name: attachedFile.name, previewUrl: attachedFile.previewUrl, type: attachedFile.type } : null,
        ts: new Date()
      };
      setChatHistory(prev => [...prev, userMsg]);
    }

    setPrompt('');
    setAttachedFile(null);
    inputRef.current?.focus();

    try {
      const historyForContext = chatHistory.slice(-8);
      const responseText = await callAiResponse(
        isPromptEmpty ? '' : trimmedPrompt,
        attachedFile?.type || '',
        attachedFile?.base64 || '',
        historyForContext
      );

      if (isPromptEmpty) {
        // Quote generation mode
        const parsed = parseAiQuotes(responseText, 5).map(text => ({
          text: String(text || '').trim(),
          author: 'Inspire AI',
          category: 'MOTIVATION'
        })).filter(q => q.text.length > 5);
        setChatHistory(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          type: 'quotes',
          quotes: parsed,
          ts: new Date()
        }]);
      } else {
        // Chat response mode
        setChatHistory(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          type: 'text',
          content: String(responseText || '').trim(),
          ts: new Date()
        }]);
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const copy = (text) => {
    copyText(text).then(ok => { if (ok) triggerToast('Copied! 📋') })
  }

  const saveItem = (text, author = 'Inspire AI') => {
    if (savedQuotes.some(q => q.text === text)) { triggerToast('Already saved! 💾'); return; }
    setSavedQuotes(prev => [{ text, author, savedAt: new Date().toISOString() }, ...prev])
    triggerToast('Saved! 💾')
  }

  const clearChat = () => { setChatHistory([]); setError(''); }

  return (
    <div className="ai-chat-page">
      {/* Header */}
      <div className="ai-chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>✨</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Inspire AI</div>
            <div style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
              Online
            </div>
          </div>
        </div>
        {chatHistory.length > 0 && (
          <button onClick={clearChat} style={{ background: 'none', border: '1px solid var(--static-border)', borderRadius: '8px', padding: '5px 10px', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            🗑️ Clear Chat
          </button>
        )}
      </div>

      {/* Chat Messages Area */}
      <div className="ai-chat-messages">
        {chatHistory.length === 0 && (
          <div className="ai-chat-empty">
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✨</div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Your Personal AI Companion</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Ask me anything, share images or files, or just hit <strong>Send</strong> for motivational quotes!
            </div>
            <div className="ai-chat-suggestions">
              {['Give me 5 quotes on success', 'Write a motivational poem', 'What is the meaning of life?'].map((s, i) => (
                <button key={i} onClick={() => { setPrompt(s); inputRef.current?.focus(); }}
                  style={{ background: 'var(--surface-color)', border: '1px solid var(--static-border)', borderRadius: '20px', padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg) => (
          <div key={msg.id} className={`ai-chat-bubble-wrap ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="ai-chat-avatar">✨</div>
            )}
            <div className={`ai-chat-bubble ${msg.role}`}>
              {/* User message */}
              {msg.role === 'user' && (
                <>
                  {msg.file && (
                    <div style={{ marginBottom: '6px' }}>
                      {msg.file.previewUrl ? (
                        <img src={msg.file.previewUrl} alt="attachment" style={{ maxWidth: '180px', maxHeight: '150px', borderRadius: '8px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                          📄 {msg.file.name}
                        </div>
                      )}
                    </div>
                  )}
                  {msg.content && <span>{msg.content}</span>}
                </>
              )}

              {/* AI text response */}
              {msg.role === 'assistant' && msg.type === 'text' && (
                <>
                  <div className="ai-markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {msg.content || ''}
                    </ReactMarkdown>
                  </div>
                  <div className="ai-bubble-actions">
                    <button onClick={() => copy(msg.content)} title="Copy">📋 Copy</button>
                    <button onClick={() => saveItem(msg.content)} title="Save">💾 Save</button>
                  </div>
                </>
              )}

              {/* AI quotes response */}
              {msg.role === 'assistant' && msg.type === 'quotes' && (
                <div className="ai-quotes-list">
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>✨ Inspirational Quotes</div>
                  {(msg.quotes || []).map((q, i) => {
                    const liked = favorites.includes(q.text)
                    return (
                      <div key={i} className="ai-quote-item">
                        <p className="ai-quote-text">"{q.text}"</p>
                        <div className="ai-quote-footer">
                          <small>— Inspire AI</small>
                          <div className="ai-quote-btns">
                            <button onClick={() => onFav(q)} className={liked ? 'active' : ''}>
                              {liked ? '❤️' : '🤍'}
                            </button>
                            <button onClick={() => saveItem(q.text)}>💾</button>
                            <button onClick={() => copy(q.text)}>📋</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="ai-chat-user-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {busy && (
          <div className="ai-chat-bubble-wrap assistant">
            <div className="ai-chat-avatar">✨</div>
            <div className="ai-chat-bubble assistant ai-typing-bubble">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="ai-chat-error">
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="ai-chat-input-area">
        {attachedFile && (
          <div className="ai-attached-preview">
            {attachedFile.previewUrl
              ? <img src={attachedFile.previewUrl} alt="preview" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.2rem' }}>📄</span>
            }
            <span style={{ fontSize: '0.8rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedFile.name}</span>
            <button onClick={clearAttachedFile} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#fc8181', padding: 0, lineHeight: 1 }}>✕</button>
          </div>
        )}
        <div className="ai-input-row">
          <label className="ai-attach-btn" title="Attach file">
            <input type="file" accept="image/*,application/pdf,text/*,audio/*,video/*" onChange={handleFileChange} style={{ display: 'none' }} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
            placeholder="Ask Inspire AI..."
            className="ai-text-input"
            disabled={busy}
          />
          <button onClick={generate} disabled={busy} className="ai-send-btn" aria-label="Send">
            {busy
              ? <span className="ai-spinner"></span>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            }
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '6px', opacity: 0.7 }}>
          Send empty to generate quotes · Enter to send
        </div>
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

  // Diagnostic Logs Terminal State
  const [diagnosticLogs, setDiagnosticLogs] = useState([
    `[${new Date().toLocaleTimeString()}] System ready. Press "Run Diagnostic" to test key connectivity.`
  ]);
  const [latency, setLatency] = useState(null);

  // 5-Slot Gemini Configurations
  const [config, setConfig] = useState({
    gemini_api_1_key: '',
    gemini_api_1_model: 'gemini-3.1-flash-lite',
    gemini_api_2_key: '',
    gemini_api_2_model: 'gemini-3.1-flash-lite',
    gemini_api_3_key: '',
    gemini_api_3_model: 'gemini-3.1-flash-lite',
    gemini_api_4_key: '',
    gemini_api_4_model: 'gemini-3.1-flash-lite',
    gemini_api_5_key: '',
    gemini_api_5_model: 'gemini-3.1-flash-lite'
  });

  // Hide/Unhide toggles state for each slot
  const [showKeys, setShowKeys] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false
  });

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
          gemini_api_1_key: data.gemini_api_1_key || '',
          gemini_api_1_model: data.gemini_api_1_model || 'gemini-3.1-flash-lite',
          gemini_api_2_key: data.gemini_api_2_key || '',
          gemini_api_2_model: data.gemini_api_2_model || 'gemini-3.1-flash-lite',
          gemini_api_3_key: data.gemini_api_3_key || '',
          gemini_api_3_model: data.gemini_api_3_model || 'gemini-3.1-flash-lite',
          gemini_api_4_key: data.gemini_api_4_key || '',
          gemini_api_4_model: data.gemini_api_4_model || 'gemini-3.1-flash-lite',
          gemini_api_5_key: data.gemini_api_5_key || '',
          gemini_api_5_model: data.gemini_api_5_model || 'gemini-3.1-flash-lite'
        });
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error loading config. Ensure setup-supabase.sql was run.');
    }
  }, [triggerToast]);

  useEffect(() => {
    if (session) {
      fetchConfig();
    }
  }, [session, fetchConfig]);

  const addLog = (msg) => {
    setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Run AI Key Diagnostic test
  const runKeyDiagnostic = async () => {
    addLog(`Initiating connection diagnostic for Gemini config slots...`);
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.rpc('generate_ai_response', {
        prompt: 'SUCCESS'
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      setLatency(duration);

      if (error) throw error;

      if (data && data.success === true) {
        addLog(`✅ DIAGNOSTIC PASS: Active slot responded successfully!`);
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
    setLoginError('');
    triggerToast('Logged out! 🔒');
  };

  // Keys Save Handler (Upserts full state to prevent loading overwrite issues)
  const saveKeySlot = async (slotIndex) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('api_config')
        .upsert({
          id: 'config',
          gemini_api_1_key: config.gemini_api_1_key,
          gemini_api_1_model: config.gemini_api_1_model,
          gemini_api_2_key: config.gemini_api_2_key,
          gemini_api_2_model: config.gemini_api_2_model,
          gemini_api_3_key: config.gemini_api_3_key,
          gemini_api_3_model: config.gemini_api_3_model,
          gemini_api_4_key: config.gemini_api_4_key,
          gemini_api_4_model: config.gemini_api_4_model,
          gemini_api_5_key: config.gemini_api_5_key,
          gemini_api_5_model: config.gemini_api_5_model,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      triggerToast(`Gemini Slot ${slotIndex} config permanently saved! 💾`);
      fetchConfig();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Clear specific slot
  const clearKeySlot = (slotIndex) => {
    setConfig(prev => ({
      ...prev,
      [`gemini_api_${slotIndex}_key`]: ''
    }));
  };

  if (!session) {
    return (
      <div className="static-page">
        <div className="static-card admin-auth-card">
          <h1>🔐 Admin Portal</h1>
          <p>Login to securely configure API keys and models on your database.</p>

          <form onSubmit={handleLogin} className="admin-form">
            <div className="form-group">
              <label>Admin Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder=""
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder=""
                required
              />
            </div>
            {loginError && <p className="form-error">{loginError}</p>}
            <div className="form-actions">
              <button type="submit" className="cta-btn" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Authenticating...' : 'Login Securely'}
              </button>
            </div>
          </form>

          <button className="cta-btn cta-secondary" style={{ marginTop: '20px', width: '100%' }} onClick={() => navTo('quotes')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="static-page">
      <div className="static-card static-wide admin-dashboard" style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            <button className="run-diag-btn" onClick={runKeyDiagnostic}>
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

        {/* Keys Configuration Panel */}
        <div className="dash-card">
          <h2>🔑 Gemini API Slots (Exclusively Google Gemini)</h2>
          
          <div className="slots-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[1, 2, 3, 4, 5].map(idx => {
              const keyVal = config[`gemini_api_${idx}_key`] || '';
              const modelVal = config[`gemini_api_${idx}_model`] || 'gemini-3.1-flash-lite';
              const isConfigured = keyVal.trim() !== '';

              return (
                <div key={idx} className="slot-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--static-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#667EEA' }}>Gemini API Slot {idx}</h3>
                    <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '6px', background: isConfigured ? 'rgba(72,187,120,0.15)' : 'rgba(255,255,255,0.05)', color: isConfigured ? '#48BB78' : '#A0AEC0' }}>
                      {isConfigured ? 'Saved & Active' : 'Not Configured'}
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>API Key</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type={showKeys[idx] ? 'text' : 'password'}
                        value={keyVal}
                        onChange={e => setConfig(prev => ({ ...prev, [`gemini_api_${idx}_key`]: e.target.value }))}
                        placeholder="Paste Gemini API key"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="cta-btn cta-secondary"
                        onClick={() => setShowKeys(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        style={{ padding: '0 12px', minHeight: 'auto' }}
                      >
                        {showKeys[idx] ? '👁️ Hide' : '👁️ Show'}
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label>Model Configuration</label>
                    <input
                      type="text"
                      value={modelVal}
                      onChange={e => setConfig(prev => ({ ...prev, [`gemini_api_${idx}_model`]: e.target.value }))}
                      placeholder="e.g. gemini-3.1-flash-lite"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="cta-btn cta-secondary"
                      onClick={() => clearKeySlot(idx)}
                      style={{ padding: '6px 12px', minHeight: 'auto', background: 'rgba(229,62,62,0.15)', color: '#E53E3E' }}
                    >
                      Clear Key
                    </button>
                    <button
                      type="button"
                      className="cta-btn"
                      onClick={() => saveKeySlot(idx)}
                      disabled={busy}
                      style={{ padding: '6px 16px', minHeight: 'auto' }}
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


