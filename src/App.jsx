import { useState, useCallback, useEffect } from 'react'
import { categories, gradients, allQuotes, currentYear } from './data'

const navPages = ['about', 'contact', 'privacy', 'terms', 'disclaimer']
const quoteTabs = ['MOTIVATION', 'SUCCESS', 'TECH', 'CRITICAL_THINKING', 'HINDI', 'URDU', 'LIKED']
const tabKeys = quoteTabs.filter(k => k !== 'LIKED')

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [page, setPage] = useState('quotes')
  const [tab, setTab] = useState('MOTIVATION')
  const [index, setIndex] = useState(0)
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inspire-favs') || '[]') }
    catch { return [] }
  })
  const [copied, setCopied] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [dark, setDark] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inspire-dark') || 'false') }
    catch { return false }
  })

  const allFiltered = tab === 'LIKED'
    ? allQuotes.filter(q => favorites.includes(q.text))
    : allQuotes.filter(q => q.category === tab)

  const quote = allFiltered.length > 0 ? allFiltered[index % allFiltered.length] : null
  const isFav = quote && favorites.includes(quote.text)
  const [g1, g2] = gradients[tab] || ['#6C63FF', '#764BA2']

  const likedQuotes = allQuotes.filter(q => favorites.includes(q.text))

  useEffect(() => { localStorage.setItem('inspire-favs', JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { localStorage.setItem('inspire-dark', JSON.stringify(dark)) }, [dark])
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { setIndex(0) }, [tab])
  useEffect(() => { setMenuOpen(false) }, [page])
  useEffect(() => { const h = () => setScrollY(window.scrollY); window.addEventListener('scroll', h, {passive: true}); return () => window.removeEventListener('scroll', h) }, [])
  useEffect(() => { if (copied) { const t = setTimeout(() => setCopied(false), 2200); return () => clearTimeout(t) } }, [copied])

  const toggleFav = useCallback(() => {
    if (!quote) return
    setFavorites(prev => isFav ? prev.filter(t => t !== quote.text) : [...prev, quote.text])
  }, [quote, isFav])

  const removeFav = useCallback((text) => {
    setFavorites(prev => prev.filter(t => t !== text))
  }, [])

  const copyQuote = useCallback(() => {
    if (!quote) return
    navigator.clipboard.writeText(`"${quote.text}" \u2014 ${quote.author}`).then(() => setCopied(true)).catch(() => {})
  }, [quote])

  const nextQuote = useCallback(() => {
    if (allFiltered.length > 0) setIndex(prev => (prev + 1) % allFiltered.length)
  }, [allFiltered.length])

  const navTo = (p) => { setPage(p); window.scrollTo(0,0) }
  const headerScrolled = scrollY > 10

  return (
    <div className="app-shell">
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <nav className={`offcanvas ${menuOpen ? 'offcanvas-open' : ''}`}>
        <button className="offcanvas-close" onClick={() => setMenuOpen(false)}>{'\u2715'}</button>
        <div className="offcanvas-links">
          <button className={page === 'quotes' ? 'oc-active' : ''} onClick={() => navTo('quotes')}>{'\uD83C\uDFE0'} Home</button>
          <button className={page === 'about' ? 'oc-active' : ''} onClick={() => navTo('about')}>{'\u2139\uFE0F'} About Us</button>
          <button className={page === 'contact' ? 'oc-active' : ''} onClick={() => navTo('contact')}>{'\uD83D\uDCDE'} Contact Us</button>
          <button className={page === 'privacy' ? 'oc-active' : ''} onClick={() => navTo('privacy')}>{'\uD83D\uDD12'} Privacy Policy</button>
          <button className={page === 'terms' ? 'oc-active' : ''} onClick={() => navTo('terms')}>{'\uD83D\uDCDC'} Terms & Conditions</button>
          <button className={page === 'disclaimer' ? 'oc-active' : ''} onClick={() => navTo('disclaimer')}>{'\u26A0\uFE0F'} Disclaimer</button>
        </div>

        <div className="offcanvas-liked">
          <h3 className="oc-liked-title">{'\u2764\uFE0F'} Liked Quotes ({likedQuotes.length})</h3>
          {likedQuotes.length === 0 ? (
            <p className="oc-liked-empty">No liked quotes yet. Tap {'\uD83E\uDE77'} on any quote!</p>
          ) : (
            <div className="oc-liked-list">
              {likedQuotes.map(q => (
                <div key={q.text} className="oc-liked-item">
                  <p className="oc-liked-text">{q.text}</p>
                  <p className="oc-liked-author">{'\u2014'} {q.author}</p>
                  <button className="oc-remove-btn" onClick={() => removeFav(q.text)} title="Unlike / Remove">
                    {'\uD83D\uDC94'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      <header className={`header ${headerScrolled ? 'header-scrolled' : ''}`}>
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
              <button className={page === 'about' ? 'dn-active' : ''} onClick={() => navTo('about')}>About Us</button>
              <button className={page === 'contact' ? 'dn-active' : ''} onClick={() => navTo('contact')}>Contact Us</button>
              <button className={page === 'privacy' ? 'dn-active' : ''} onClick={() => navTo('privacy')}>Privacy Policy</button>
              <button className={page === 'terms' ? 'dn-active' : ''} onClick={() => navTo('terms')}>Terms</button>
              <button className={page === 'disclaimer' ? 'dn-active' : ''} onClick={() => navTo('disclaimer')}>Disclaimer</button>
            </nav>
            <button className="theme-toggle" onClick={() => setDark(prev => !prev)} title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {page === 'quotes' ? (
          <div className="app" style={{ background: `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`, minHeight: '100vh' }}>
            <div className="container">
              <div className="tabs">
                {tabKeys.map(key => (
                  <button key={key} className={`tab ${key === tab ? 'tab-active' : ''}`} onClick={() => setTab(key)}>
                    <span className="tab-emoji">{categories[key].emoji}</span>
                    <span className="tab-label">{categories[key].label}</span>
                  </button>
                ))}
                <button className={`tab ${'LIKED' === tab ? 'tab-active liked-tab' : ''}`} onClick={() => setTab('LIKED')}>
                  <span className="tab-emoji">{categories.LIKED.emoji}</span>
                  <span className="tab-label">{categories.LIKED.label}{favorites.length > 0 ? ` (${favorites.length})` : ''}</span>
                </button>
              </div>

              {allFiltered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <p style={{ fontSize: '3rem', marginBottom: '8px' }}>{'\uD83D\uDC94'}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>No liked quotes yet. Tap the heart on any quote to save it here!</p>
                </div>
              ) : (
                <>
                  <div className="card">
                    <span className="quote-marks" style={{ color: g1 }}>{'\u275D\u275E'}</span>
                    <p className="quote-text">{quote.text}</p>
                    <div className="divider" style={{ background: g1 }} />
                    <p className="quote-author">{'\u2014'} {quote.author}</p>

                    <div className="actions">
                      <button className="action-btn" onClick={toggleFav} title={isFav ? 'Remove favorite' : 'Add favorite'}>
                        {isFav ? '\u2764\uFE0F' : '\uD83E\uDE77'}
                      </button>
                      <button className="action-btn" onClick={copyQuote} title="Copy to clipboard">
                        {'\uD83D\uDCCB'}
                      </button>
                    </div>

                    {copied && <p className="copied-feedback" style={{ color: g1 }}>{'\u2705'} Copied to clipboard!</p>}

                    <p className="quote-count">{allFiltered.length} quotes{tab === 'LIKED' ? ' liked' : ' in this category'}</p>
                  </div>

                  <button className="next-btn" onClick={nextQuote} style={{ color: g1 }}>
                    Next Quote
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <StaticPage page={page} navTo={navTo} />
        )}
      </main>

      <footer className="footer">
        <p className="copyright">{'\u00A9'} {currentYear} Sohel Khan. All rights reserved.</p>
      </footer>
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
            <p>Our mission is to bring you the most inspiring quotes from great thinkers, leaders, philosophers, and visionaries across the world. We curate hand-picked quotes across categories like Motivation, Success, Technology, Critical Thinking, Hindi Wisdom, and Urdu Poetry.</p>
            <p>Inspire was built with a simple belief: <em>words have the power to change your mindset, and a changed mindset can change your life.</em></p>
            <p>Whether you need a push to start your day, a spark of creativity for your work, or some ancient wisdom for your soul — Inspire is here for you.</p>
            <button className="cta-btn" onClick={() => navTo('quotes')}>Explore Quotes</button>
          </>
        )}
        {page === 'contact' && (
          <>
            <h1>Contact Us</h1>
            <p>We'd love to hear from you! Whether you have a suggestion, want to contribute quotes, or just want to say hello — feel free to reach out.</p>
            <div className="contact-card">
              <span className="contact-icon">{'\uD83D\uDCDE'}</span>
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
            <p>Inspire ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we handle your information.</p>
            <h2>Information We Collect</h2>
            <p>Inspire does <strong>not</strong> collect, store, or transmit any personal data. All favorites and preferences are stored locally on your device using your browser's localStorage and never leave your device.</p>
            <h2>Third-Party Services</h2>
            <p>We do not use any third-party analytics, advertising, or tracking services.</p>
            <h2>Changes to This Policy</h2>
            <p>We may update this policy from time to time. Continued use of Inspire after changes constitutes acceptance.</p>
          </>
        )}
        {page === 'terms' && (
          <>
            <h1>Terms & Conditions</h1>
            <p><strong>Last updated:</strong> July 2026</p>
            <p>By accessing and using Inspire, you agree to be bound by these Terms & Conditions.</p>
            <h2>Use of Content</h2>
            <p>All quotes displayed on Inspire are attributed to their original authors where known. The compilation, design, and user interface are the intellectual property of Inspire.</p>
            <h2>Disclaimer</h2>
            <p>The content on Inspire is provided for informational and motivational purposes only. We make no guarantees about the accuracy or completeness of quote attributions.</p>
            <h2>Limitation of Liability</h2>
            <p>Inspire shall not be liable for any damages arising from the use or inability to use the application.</p>
          </>
        )}
        {page === 'disclaimer' && (
          <>
            <h1>Disclaimer</h1>
            <p><strong>Last updated:</strong> July 2026</p>
            <h2>General Disclaimer</h2>
            <p>The information provided by Inspire is for general informational and motivational purposes only. All information is provided in good faith; however, we make no representation or warranty of any kind.</p>
            <h2>Quote Attribution</h2>
            <p>While we strive to verify quote attributions, some attributions may be inaccurate or disputed. Quotes marked as "Unknown" reflect our inability to verify the original source.</p>
            <h2>External Links</h2>
            <p>Inspire may contain links to external websites. We are not responsible for the content or privacy practices of those sites.</p>
            <h2>No Professional Advice</h2>
            <p>The content on Inspire does not constitute professional advice of any kind (legal, medical, financial, or otherwise).</p>
          </>
        )}
      </div>
    </div>
  )
}
