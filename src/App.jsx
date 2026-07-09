import { useState, useCallback, useEffect, useReducer, useMemo, useRef } from 'react'
import { categories, gradients, allQuotes, currentYear } from './data'
import { staticPages } from './pagesContent'
import { APP_NAME, APP_VERSION, APP_BUILD, RELEASES_PAGE, detectPlatform, platformLabel } from './version'
import { checkForUpdates, formatBytes, openDownload } from './updateService'

const tabKeys = Object.keys(categories).filter(k => k !== 'LIKED')
const PER_PAGE = 10

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
function getFontScale() { try { return parseFloat(localStorage.getItem('inspire-font') || '1') } catch { return 1 } }

function dailyQuoteIndex() {
  const d = new Date()
  const key = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate()
  return key % Math.max(allQuotes.length, 1)
}

function createAmbientMusic(mode = 'calm') {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = 0.038
  master.connect(ctx.destination)
  const presets = {
    calm: { notes: [261.63, 329.63, 392], types: ['sine', 'triangle', 'triangle'] },
    focus: { notes: [220, 330, 440], types: ['triangle', 'sine', 'triangle'] },
    rain: { notes: [174.61, 261.63, 349.23], types: ['sine', 'sine', 'triangle'] },
  }
  const selected = presets[mode] || presets.calm
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = mode === 'focus' ? 0.18 : 0.08
  lfoGain.gain.value = mode === 'rain' ? 0.012 : 0.006
  lfo.connect(lfoGain)
  lfoGain.connect(master.gain)
  lfo.start()
  const oscillators = selected.notes.map((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = selected.types[i]
    osc.frequency.value = freq
    gain.gain.value = i === 0 ? 0.42 : 0.2
    osc.connect(gain)
    gain.connect(master)
    osc.start()
    return osc
  })
  return {
    stop() {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
      setTimeout(() => {
        try { lfo.stop() } catch {}
        oscillators.forEach(osc => {
          try { osc.stop() } catch {}
        })
        try { ctx.close() } catch {}
      }, 250)
    },
  }
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
  const [scrollY, setScrollY] = useState(0)
  const [dark, setDark] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inspire-dark') || 'false') } catch { return false }
  })
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('inspire-view') || 'card')
  const [listPage, setListPage] = useState(0)
  const [search, setSearch] = useState('')
  const [fontScale, setFontScale] = useState(getFontScale)
  const [updateBadge, setUpdateBadge] = useState(false)
  const [musicOn, setMusicOn] = useState(false)
  const [musicMode, setMusicMode] = useState(() => localStorage.getItem('inspire-music-mode') || 'calm')
  const [customMusicName, setCustomMusicName] = useState('')
  const [lastScrollTop, setLastScrollTop] = useState(0)
  const [chromeHidden, setChromeHidden] = useState(false)
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(true)
  const musicRef = useRef(null)
  const customMusicUrlRef = useRef('')
  const categoryTapRef = useRef({ key: '', time: 0 })

  const allFiltered = useMemo(() => {
    let list = tab === 'LIKED'
      ? allQuotes.filter(q => favorites.includes(q.text))
      : allQuotes.filter(q => q.category === tab)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(item =>
        item.text.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q)
      )
    }
    return list
  }, [tab, favorites, search])

  const safeIndex = allFiltered.length > 0 ? index % allFiltered.length : 0
  const quote = allFiltered.length > 0 ? allFiltered[safeIndex] : null
  const isFav = quote && favorites.includes(quote.text)
  const [g1, g2] = gradients[tab] || ['#6C63FF', '#764BA2']

  const totalPages = Math.max(1, Math.ceil(allFiltered.length / PER_PAGE))
  const listStart = listPage * PER_PAGE
  const listQuotes = allFiltered.slice(listStart, listStart + PER_PAGE)
  const todayQuote = allQuotes[dailyQuoteIndex()]
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
  useEffect(() => { localStorage.setItem('inspire-font', String(fontScale)) }, [fontScale])
  useEffect(() => { localStorage.setItem('inspire-music-mode', musicMode) }, [musicMode])
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { document.documentElement.style.setProperty('--quote-scale', String(fontScale)) }, [fontScale])
  useEffect(() => { if (page === 'archive') setPage('quotes') }, [page])
  useEffect(() => { setMenuOpen(false) }, [page, tab])
  useEffect(() => { if (copied) { const t = setTimeout(() => setCopied(false), 2200); return () => clearTimeout(t) } }, [copied])
  useEffect(() => { setListPage(0); setIndex(0) }, [tab, search])
  useEffect(() => () => {
    if (musicRef.current) musicRef.current.stop()
    if (customMusicUrlRef.current) URL.revokeObjectURL(customMusicUrlRef.current)
  }, [])

  // Silent background update check (does not block UI)
  useEffect(() => {
    let cancelled = false
    checkForUpdates().then(r => {
      if (!cancelled && r.hasUpdate) setUpdateBadge(true)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const setTab = useCallback((t) => {
    setTabState(t)
    setIndex(getSavedIndex(t))
    setListPage(0)
  }, [])

  const setIndexWrap = useCallback((idx, cat) => {
    const c = cat || tab
    const qs = c === 'LIKED' ? allQuotes.filter(q => favorites.includes(q.text)) : allQuotes.filter(q => q.category === c)
    const wrapped = qs.length > 0 ? ((idx % qs.length) + qs.length) % qs.length : 0
    setIndex(wrapped)
    saveIndex(c, wrapped)
  }, [tab, favorites])

  const toggleFav = useCallback(() => {
    if (!quote) return
    setUndoStack(prev => [...prev, { type: 'TOGGLE', text: quote.text }].slice(-30))
    setRedoStack([])
    dispatchFav({ type: 'TOGGLE', text: quote.text })
  }, [quote])

  const removeFavInline = useCallback((text) => {
    setUndoStack(prev => [...prev, { type: 'REMOVE', text }].slice(-30))
    setRedoStack([])
    dispatchFav({ type: 'REMOVE', text })
  }, [])

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    setRedoStack(prev => [...prev, last])
    setUndoStack(prev => prev.slice(0, -1))
    if (last.type === 'TOGGLE') dispatchFav({ type: 'TOGGLE', text: last.text })
    else if (last.type === 'REMOVE') dispatchFav({ type: 'RESTORE', payload: [...favorites, last.text] })
    else if (last.type === 'CATEGORY') setTab(last.from)
  }, [undoStack, favorites, setTab])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(prev => [...prev, next])
    setRedoStack(prev => prev.slice(0, -1))
    if (next.type === 'TOGGLE') dispatchFav({ type: 'TOGGLE', text: next.text })
    else if (next.type === 'REMOVE') dispatchFav({ type: 'REMOVE', text: next.text })
    else if (next.type === 'CATEGORY') setTab(next.to)
  }, [redoStack, setTab])

  const switchToCategory = useCallback((t) => {
    setUndoStack(prev => [...prev, { type: 'CATEGORY', from: tab, to: t }].slice(-30))
    setRedoStack([])
    setTab(t)
  }, [tab, setTab])

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
    navigator.clipboard.writeText(quote.text).then(() => setCopied(true)).catch(() => {})
  }, [quote])

  const shareQuote = useCallback(async () => {
    if (!quote) return
    const payload = { title: 'Inspire Quote', text: `"${quote.text}" — ${quote.author}` }
    try {
      if (navigator.share) {
        await navigator.share(payload)
      } else {
        await navigator.clipboard.writeText(payload.text)
        setCopied(true)
      }
    } catch {
      try {
        await navigator.clipboard.writeText(payload.text)
        setCopied(true)
      } catch {}
    }
  }, [quote])

  const copyListQuote = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {})
  }, [])

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
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); shareQuote() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, viewMode, prevQuote, nextQuote, toggleFav, copyQuote, shareQuote])

  const prevListPage = () => setListPage(p => Math.max(0, p - 1))
  const nextListPage = () => setListPage(p => Math.min(totalPages - 1, p + 1))

  const toggleMusic = () => {
    if (musicOn) {
      if (musicRef.current) musicRef.current.stop()
      musicRef.current = null
      setMusicOn(false)
      return
    }
    const player = createAmbientMusic(musicMode)
    if (player) {
      musicRef.current = player
      setMusicOn(true)
    }
  }

  const changeMusicMode = (mode) => {
    setMusicMode(mode)
    if (!musicOn) return
    if (musicRef.current) musicRef.current.stop()
    const player = createAmbientMusic(mode)
    if (player) musicRef.current = player
  }

  const handleMusicUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (musicRef.current) musicRef.current.stop()
    if (customMusicUrlRef.current) URL.revokeObjectURL(customMusicUrlRef.current)
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.loop = true
    audio.volume = 0.45
    customMusicUrlRef.current = url
    musicRef.current = {
      stop() {
        audio.pause()
        audio.currentTime = 0
      },
    }
    setCustomMusicName(file.name)
    setMusicMode('custom')
    audio.play().then(() => setMusicOn(true)).catch(() => setMusicOn(false))
  }

  const handleMainScroll = (e) => {
    const top = e.currentTarget.scrollTop
    setLastScrollTop(top)
    setScrollY(top)
  }

  const navTo = (p) => {
    setPage(p === 'archive' ? 'quotes' : p)
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const headerScrolled = scrollY > 10

  const navItems = [
    { id: 'quotes', label: 'Home', emoji: '🏠' },
    { id: 'daily', label: 'Daily', emoji: '☀️' },
    { id: 'updates', label: 'Updates', emoji: '🔄', badge: updateBadge },
    { id: 'about', label: 'About Us', emoji: 'ℹ️' },
    { id: 'contact', label: 'Contact', emoji: '📞' },
    { id: 'privacy', label: 'Privacy', emoji: '🔒' },
    { id: 'terms', label: 'Terms', emoji: '📜' },
    { id: 'disclaimer', label: 'Disclaimer', emoji: '⚠️' },
  ]
  const bottomNavItems = navItems.slice(0, 5)

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
            <button key={item.id} className={page === item.id ? 'oc-active' : ''} onClick={() => navTo(item.id)}>
              {item.emoji} {item.label}
              {item.badge && <span className="nav-badge">New</span>}
            </button>
          ))}
        </div>
        <div className="offcanvas-actions">
          <button className="oc-undo-btn" onClick={handleUndo} disabled={undoStack.length === 0}>↩ Undo</button>
          <button className="oc-redo-btn" onClick={handleRedo} disabled={redoStack.length === 0}>↪ Redo</button>
        </div>
        <div className="oc-font-row">
          <span>Text size</span>
          <button onClick={() => setFontScale(s => Math.max(0.85, +(s - 0.1).toFixed(2)))} aria-label="Smaller">A−</button>
          <button onClick={() => setFontScale(1)}>A</button>
          <button onClick={() => setFontScale(s => Math.min(1.4, +(s + 0.1).toFixed(2)))} aria-label="Larger">A+</button>
        </div>
        <div className="oc-version-bottom">
          <span>{APP_NAME}</span>
          <strong>v{APP_VERSION}</strong>
          <small>Build {APP_BUILD}</small>
        </div>
      </nav>

      <header className={'header' + (headerScrolled ? ' header-scrolled' : '') + (chromeHidden ? ' chrome-hidden' : '')}>
        <div className="header-inner">
          <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu"><span /><span /><span /></button>
          <svg className="logo-svg" onClick={() => navTo('quotes')} viewBox="0 0 200 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer' }}>
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
                <button key={item.id} className={page === item.id ? 'dn-active' : ''} onClick={() => navTo(item.id)}>
                  {item.label}
                  {item.badge && <span className="nav-badge-dot" />}
                </button>
              ))}
              <span className="undo-redo-inline">
                <button onClick={handleUndo} disabled={undoStack.length === 0} title="Undo">↩</button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo">↪</button>
              </span>
            </nav>
            <button className="theme-toggle" onClick={() => setDark(prev => !prev)} title={dark ? 'Light' : 'Dark'}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content" onScroll={handleMainScroll}>
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
                  <p className="side-hint">Keyboard: ← → navigate · F favorite · C copy · S share</p>
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
                      <button className={'vt-btn music-btn' + (musicOn ? ' music-on' : '')} onClick={toggleMusic}>
                        {musicOn ? 'Music On' : 'Music Off'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="music-panel">
                  <span>Music</span>
                  {['calm', 'focus', 'rain'].map(mode => (
                    <button key={mode} className={musicMode === mode ? 'music-chip music-chip-active' : 'music-chip'} onClick={() => changeMusicMode(mode)}>
                      {mode[0].toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                  <label className="music-upload">
                    Upload
                    <input type="file" accept="audio/*" onChange={handleMusicUpload} />
                  </label>
                  {customMusicName && <small>{customMusicName}</small>}
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
                        <button className="action-btn" onClick={shareQuote} title="Share">📤</button>
                      </div>
                      {copied && <p className="copied-feedback" style={{ color: g1 }}>✅ Copied!</p>}
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
                      {copied && <p className="copied-feedback" style={{ color: g1, textAlign: 'center', marginTop: '8px' }}>✅ Copied!</p>}
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
          <DailyPage quotes={dailyQuotes} navTo={navTo} onFav={(text) => dispatchFav({ type: 'TOGGLE', text })} favorites={favorites} />
        ) : page === 'updates' ? (
          <UpdatesPage onSeenUpdate={() => setUpdateBadge(false)} />
        ) : (
          <StaticPage page={page} navTo={navTo} />
        )}
      </main>

      {(currentPlatform === 'android' || currentPlatform === 'ios') && (
        <nav className={currentPlatform === 'ios' ? 'ios-tabbar' : 'android-bottom-nav'} aria-label={`${currentPlatform} bottom navigation`}>
          {bottomNavItems.map(item => (
            <button key={item.id} className={page === item.id ? (currentPlatform === 'ios' ? 'ios-tab-active' : 'android-nav-active') : ''} onClick={() => navTo(item.id)}>
              <span>{item.emoji}</span>
              <small>{item.label}</small>
              {item.badge && <i />}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

function DailyPage({ quotes, navTo, onFav, favorites }) {
  const lead = quotes[0]
  const [g1, g2] = gradients[lead.category] || ['#667EEA', '#764BA2']
  const copy = (text) => navigator.clipboard.writeText(text).catch(() => {})
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
                  <button className="cta-btn" onClick={() => onFav(quote.text)}>{isFav ? '❤️ Liked' : '🤍 Like'}</button>
                  <button className="cta-btn cta-secondary" onClick={() => copy(quote.text)}>📋 Copy</button>
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

function UpdatesPage({ onSeenUpdate }) {
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const platform = detectPlatform()

  const runCheck = async () => {
    setStatus('loading')
    setError('')
    try {
      const r = await checkForUpdates()
      setResult(r)
      setStatus('done')
      if (r.hasUpdate) onSeenUpdate?.()
      else onSeenUpdate?.()
    } catch (e) {
      setError(e.message || 'Update check failed')
      setStatus('error')
    }
  }

  useEffect(() => { runCheck() }, []) // auto-check when opening page

  return (
    <div className="static-page">
      <div className="static-card updates-card">
        <h1>🔄 App Updates</h1>
        <p>Check for new builds published on GitHub Releases. When a new release is published after your push, every device can see it here and download the matching installer.</p>

        <div className="version-box">
          <div>
            <span className="vb-label">Installed version</span>
            <strong className="vb-value">v{APP_VERSION}</strong>
          </div>
          <div>
            <span className="vb-label">Build</span>
            <strong className="vb-value">{APP_BUILD}</strong>
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
          <a className="release-link-btn" href={RELEASES_PAGE} target="_blank" rel="noreferrer">GitHub Releases</a>
        </div>

        {status === 'error' && (
          <div className="update-alert update-error">
            <p><strong>Could not check updates.</strong> {error}</p>
            <p>Make sure you are online. You can also open releases manually:</p>
            <a className="phone-link" href={RELEASES_PAGE} target="_blank" rel="noreferrer">Open GitHub Releases</a>
          </div>
        )}

        {status === 'done' && result && (
          <div className={'update-alert ' + (result.hasUpdate ? 'update-available' : 'update-ok')}>
            <p><strong>{result.hasUpdate ? '🎉 Update available!' : '✅ You are up to date'}</strong></p>
            <p>{result.message}</p>

            {result.hasUpdate && result.release && (
              <>
                <h2>What’s new — {result.release.name || result.release.tag}</h2>
                <pre className="changelog">{result.release.body || 'See release notes on GitHub.'}</pre>
                <p className="muted-date">Published: {result.release.publishedAt ? new Date(result.release.publishedAt).toLocaleString() : '—'}</p>

                {result.asset ? (
                  <div className="download-box">
                    <p>Recommended for <strong>{platformLabel(result.platform)}</strong>:</p>
                    <button className="cta-btn" onClick={() => openDownload(result.asset.url)}>
                      ⬇️ Download {result.asset.name} {result.asset.size ? `(${formatBytes(result.asset.size)})` : ''}
                    </button>
                    <p className="small-note">After download, install/open the file on this device. Reopen the app — the version number will change to the new release.</p>
                  </div>
                ) : (
                  <div className="download-box">
                    <p>No direct installer matched this device automatically. Download from the full release page or pick an asset below.</p>
                    <a className="cta-btn" href={result.release.htmlUrl || RELEASES_PAGE} target="_blank" rel="noreferrer">Open release page</a>
                  </div>
                )}

                {result.allAssets?.length > 0 && (
                  <>
                    <h2>All platform files</h2>
                    <ul className="asset-list">
                      {result.allAssets.map(a => (
                        <li key={a.url}>
                          <button className="linkish" onClick={() => openDownload(a.url)}>
                            {a.name} {a.size ? `(${formatBytes(a.size)})` : ''}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
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
          <li>App shows new <strong>version number</strong>, <strong>changelog</strong>, and download for their device.</li>
          <li>After installing the new build, the installed version shown here updates automatically.</li>
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
