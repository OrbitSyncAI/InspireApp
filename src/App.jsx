import { useState, useCallback, useEffect, useReducer } from 'react'
import { categories, gradients, allQuotes, currentYear } from './data'

const tabKeys = Object.keys(categories).filter(k => k !== 'LIKED')

function favReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': return state.includes(action.text) ? state.filter(t => t !== action.text) : [...state, action.text]
    case 'REMOVE': return state.filter(t => t !== action.text)
    case 'RESTORE': return action.payload
    default: return state
  }
}

function getSavedIndex(cat) {
  try { return parseInt(localStorage.getItem('inspire-idx-'+cat) || '0', 10) } catch { return 0 }
}
function saveIndex(cat, idx) {
  try { localStorage.setItem('inspire-idx-'+cat, String(idx)) } catch {}
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

  const allFiltered = tab === 'LIKED'
    ? allQuotes.filter(q => favorites.includes(q.text))
    : allQuotes.filter(q => q.category === tab)

  const safeIndex = allFiltered.length > 0 ? index % allFiltered.length : 0
  const quote = allFiltered.length > 0 ? allFiltered[safeIndex] : null
  const isFav = quote && favorites.includes(quote.text)
  const [g1, g2] = gradients[tab] || ['#6C63FF', '#764BA2']

  useEffect(() => { localStorage.setItem('inspire-favs', JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { localStorage.setItem('inspire-dark', JSON.stringify(dark)) }, [dark])
  useEffect(() => { localStorage.setItem('inspire-page', page) }, [page])
  useEffect(() => { localStorage.setItem('inspire-tab', tab) }, [tab])
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { setMenuOpen(false) }, [page, tab])
  useEffect(() => { const h = () => setScrollY(window.scrollY); window.addEventListener('scroll', h, {passive: true}); return () => window.removeEventListener('scroll', h) }, [])
  useEffect(() => { if (copied) { const t = setTimeout(() => setCopied(false), 2200); return () => clearTimeout(t) } }, [copied])

  const setTab = useCallback((t) => {
    setTabState(t)
    setIndex(getSavedIndex(t))
  }, [])

  const setIndexWrap = useCallback((idx, cat) => {
    const c = cat || tab
    const qs = c === 'LIKED' ? allQuotes.filter(q => favorites.includes(q.text)) : allQuotes.filter(q => q.category === c)
    const wrapped = qs.length > 0 ? idx % qs.length : 0
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
    if (last.type === 'TOGGLE') {
      dispatchFav({ type: 'TOGGLE', text: last.text })
    } else if (last.type === 'REMOVE') {
      dispatchFav({ type: 'RESTORE', payload: [...favorites, last.text] })
    } else if (last.type === 'CATEGORY') {
      setTab(last.from)
    }
  }, [undoStack, favorites])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(prev => [...prev, next])
    setRedoStack(prev => prev.slice(0, -1))
    if (next.type === 'TOGGLE') {
      dispatchFav({ type: 'TOGGLE', text: next.text })
    } else if (next.type === 'REMOVE') {
      dispatchFav({ type: 'REMOVE', text: next.text })
    } else if (next.type === 'CATEGORY') {
      setTab(next.to)
    }
  }, [redoStack])

  const switchToCategory = useCallback((t) => {
    setUndoStack(prev => [...prev, { type: 'CATEGORY', from: tab, to: t }].slice(-30))
    setRedoStack([])
    setTab(t)
  }, [tab, setTab])

  const copyQuote = useCallback(() => {
    if (!quote) return
    navigator.clipboard.writeText('"' + quote.text + '" — ' + quote.author).then(() => setCopied(true)).catch(() => {})
  }, [quote])

  const prevQuote = useCallback(() => {
    if (allFiltered.length > 0) setIndexWrap(safeIndex - 1 + allFiltered.length)
  }, [allFiltered.length, safeIndex, setIndexWrap, tab])

  const nextQuote = useCallback(() => {
    if (allFiltered.length > 0) setIndexWrap(safeIndex + 1)
  }, [allFiltered.length, safeIndex, setIndexWrap, tab])

  const navTo = (p) => { setPage(p); window.scrollTo(0,0) }
  const headerScrolled = scrollY > 10

  return (
    <div className="app-shell">
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <nav className={'offcanvas' + (menuOpen ? ' offcanvas-open' : '')}>
        <button className="offcanvas-close" onClick={() => setMenuOpen(false)}>✕</button>
        <div className="offcanvas-links">
          <button className={page === 'quotes' ? 'oc-active' : ''} onClick={() => navTo('quotes')}>🏠 Home</button>
          <button className={page === 'archive' ? 'oc-active' : ''} onClick={() => navTo('archive')}>📁 Archive</button>
          <button className={page === 'about' ? 'oc-active' : ''} onClick={() => navTo('about')}>ℹ️ About Us</button>
          <button className={page === 'contact' ? 'oc-active' : ''} onClick={() => navTo('contact')}>📞 Contact Us</button>
          <button className={page === 'privacy' ? 'oc-active' : ''} onClick={() => navTo('privacy')}>🔒 Privacy Policy</button>
          <button className={page === 'terms' ? 'oc-active' : ''} onClick={() => navTo('terms')}>📜 Terms & Conditions</button>
          <button className={page === 'disclaimer' ? 'oc-active' : ''} onClick={() => navTo('disclaimer')}>⚠️ Disclaimer</button>
        </div>
        <div className="offcanvas-actions">
          <button className="oc-undo-btn" onClick={handleUndo} disabled={undoStack.length === 0}>↩ Undo</button>
          <button className="oc-redo-btn" onClick={handleRedo} disabled={redoStack.length === 0}>↪ Redo</button>
        </div>
      </nav>

      <header className={'header' + (headerScrolled ? ' header-scrolled' : '')}>
        <div className="header-inner">
          <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <svg className="logo-svg" onClick={() => navTo('quotes')} viewBox="0 0 200 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{cursor:'pointer'}}>
            <defs>
              <linearGradient id="lgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#667EEA"/>
                <stop offset="100%" stopColor="#F093FB"/>
              </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#lgGrad)" opacity="0.15"/>
            <path d="M24 10 L20 20 L30 20 L26 30" fill="none" stroke="url(#lgGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="56" y="31" fill="url(#lgGrad)" fontFamily="system-ui, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-0.5">Inspire</text>
          </svg>
          <div className="header-actions">
            <nav className="desktop-nav">
              <button className={page === 'quotes' ? 'dn-active' : ''} onClick={() => navTo('quotes')}>Home</button>
              <button className={page === 'archive' ? 'dn-active' : ''} onClick={() => navTo('archive')}>Archive</button>
              <button className={page === 'about' ? 'dn-active' : ''} onClick={() => navTo('about')}>About</button>
              <button className={page === 'contact' ? 'dn-active' : ''} onClick={() => navTo('contact')}>Contact</button>
              <button className={page === 'privacy' ? 'dn-active' : ''} onClick={() => navTo('privacy')}>Privacy</button>
              <button className={page === 'terms' ? 'dn-active' : ''} onClick={() => navTo('terms')}>Terms</button>
              <button className={page === 'disclaimer' ? 'dn-active' : ''} onClick={() => navTo('disclaimer')}>Disclaimer</button>
              <span className="undo-redo-inline">
                <button onClick={handleUndo} disabled={undoStack.length === 0} title="Undo">↩</button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo">↪</button>
              </span>
            </nav>
            <button className="theme-toggle" onClick={() => setDark(prev => !prev)} title={dark ? 'Switch to Light' : 'Switch to Dark'}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {page === 'quotes' ? (
          <div className="app" style={{ background: 'linear-gradient(135deg, ' + g1 + ' 0%, ' + g2 + ' 100%)' }}>
            <div className="container">
              <div className="tabs">
                {tabKeys.map(key => (
                  <button key={key} className={'tab' + (key === tab ? ' tab-active' : '')} onClick={() => switchToCategory(key)}>
                    <span className="tab-emoji">{categories[key].emoji}</span>
                    <span className="tab-label">{categories[key].label}</span>
                  </button>
                ))}
                <button className={'tab' + ('LIKED' === tab ? ' tab-active liked-tab' : '')} onClick={() => setTab('LIKED')}>
                  <span className="tab-emoji">{categories.LIKED.emoji}</span>
                  <span className="tab-label">{categories.LIKED.label}{favorites.length > 0 ? ' (' + favorites.length + ')' : ''}</span>
                </button>
              </div>

              {allFiltered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
                  <p style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💔</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>No liked quotes yet. Tap the heart on any quote!</p>
                </div>
              ) : (
                <>
                  <div className="card">
                    <span className="quote-marks" style={{ color: g1 }}>❝❞</span>
                    <p className="quote-text">{quote.text}</p>
                    <div className="divider" style={{ background: g1 }} />
                    <p className="quote-author">— {quote.author}</p>

                    <div className="actions">
                      <button className="action-btn" onClick={toggleFav} title={isFav ? 'Remove favorite' : 'Add favorite'}>
                        {isFav ? '❤️' : '🤍'}
                      </button>
                      <button className="action-btn" onClick={copyQuote} title="Copy to clipboard">
                        📋
                      </button>
                    </div>

                    {copied && <p className="copied-feedback" style={{ color: g1 }}>✅ Copied!</p>}

                    {tab === 'LIKED' && favorites.length > 0 && (
                      <button className="remove-inline-btn" onClick={() => removeFavInline(quote.text)}>
                        🗑 Remove this quote
                      </button>
                    )}

                    <p className="quote-count">{allFiltered.length} quotes{tab === 'LIKED' ? ' liked' : ' in this category'}</p>
                  </div>

                  <div className="nav-row">
                    <button className="nav-btn" onClick={prevQuote} style={{ color: g1 }}>← Previous</button>
                    <button className="nav-btn" onClick={nextQuote} style={{ color: g1 }}>Next →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : page === 'archive' ? (
          <ArchivePage navTo={navTo} />
        ) : (
          <StaticPage page={page} navTo={navTo} />
        )}
      </main>

      <footer className="footer">
        <p className="copyright">© {currentYear} Sohel Khan. All rights reserved.</p>
      </footer>
    </div>
  )
}

function ArchivePage({ navTo }) {
  const allCats = Object.keys(categories).filter(k => k !== 'LIKED')
  const [activeCat, setActiveCat] = useState(allCats[0])
  const quotesForCat = allQuotes.filter(q => q.category === activeCat)

  return (
    <div className="archive-page">
      <h1 className="archive-title">📁 Archive</h1>
      <div className="archive-tabs">
        {allCats.map(cat => (
          <button key={cat} className={'archive-tab' + (cat === activeCat ? ' archive-tab-active' : '')} onClick={() => setActiveCat(cat)}>
            {categories[cat].emoji} {categories[cat].label}
          </button>
        ))}
      </div>
      <div className="archive-grid">
        {quotesForCat.map((q, i) => (
          <div key={i} className="archive-card">
            <p className="archive-quote-text">{q.text}</p>
            <p className="archive-quote-author">— {q.author}</p>
          </div>
        ))}
      </div>
      <button className="cta-btn" onClick={() => navTo('quotes')} style={{ marginTop: '24px' }}>Back to Quotes</button>
    </div>
  )
}

function StaticPage({ page, navTo }) {
  return (
    <div className="static-page">
      <div className="static-card">
        {page === 'about' && (
          <>
            <h1>About Us</h1>
            <p>Welcome to <strong>Inspire</strong> — your daily dose of motivation, wisdom, and positivity.</p>
            <p>Our mission is to bring you the most inspiring quotes from great thinkers, leaders, philosophers, and visionaries across the world.</p>
            <p>Inspire was built with a simple belief: <em>words have the power to change your mindset, and a changed mindset can change your life.</em></p>
            <button className="cta-btn" onClick={() => navTo('quotes')}>Explore Quotes</button>
          </>
        )}
        {page === 'contact' && (
          <>
            <h1>Contact Us</h1>
            <p>We'd love to hear from you! Whether you have a suggestion, want to contribute quotes, or just want to say hello — feel free to reach out.</p>
            <div className="contact-card">
              <span className="contact-icon">📞</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>Call / WhatsApp</p>
                <a href="tel:+919026053036" className="phone-link">+91 90260 53036</a>
              </div>
            </div>
            <p style={{ marginTop: '16px' }}>We typically respond within 24 hours.</p>
            <button className="cta-btn" onClick={() => navTo('quotes')}>Back to Quotes</button>
          </>
        )}
        {page === 'privacy' && (
          <>
            <h1>Privacy Policy</h1>
            <p><strong>Last updated:</strong> July 2026</p>
            <p>Inspire does <strong>not</strong> collect, store, or transmit any personal data. All favorites and preferences are stored locally on your device using your browser's localStorage and never leave your device.</p>
            <h2>Third-Party Services</h2>
            <p>We do not use any third-party analytics, advertising, or tracking services.</p>
          </>
        )}
        {page === 'terms' && (
          <>
            <h1>Terms & Conditions</h1>
            <p><strong>Last updated:</strong> July 2026</p>
            <p>By accessing and using Inspire, you agree to be bound by these Terms & Conditions.</p>
            <h2>Use of Content</h2>
            <p>All quotes displayed on Inspire are attributed to their original authors where known. The compilation, design, and user interface are the intellectual property of Inspire.</p>
          </>
        )}
        {page === 'disclaimer' && (
          <>
            <h1>Disclaimer</h1>
            <p><strong>Last updated:</strong> July 2026</p>
            <p>The information provided by Inspire is for general informational and motivational purposes only.</p>
            <h2>No Professional Advice</h2>
            <p>The content on Inspire does not constitute professional advice of any kind.</p>
          </>
        )}
      </div>
    </div>
  )
}
