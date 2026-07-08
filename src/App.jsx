import { useState, useCallback, useEffect } from 'react'
import { categories, gradients, allQuotes } from './data'

const catKeys = Object.keys(categories)

export default function App() {
  const [category, setCategory] = useState('MOTIVATION')
  const quotes = allQuotes.filter(q => q.category === category)
  const [index, setIndex] = useState(0)
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inspire-favs') || '[]') }
    catch { return [] }
  })
  const [copied, setCopied] = useState(false)

  const [g1, g2] = gradients[category]
  const quote = quotes[index] || quotes[0]
  const isFav = quote && favorites.includes(quote.text)

  useEffect(() => { localStorage.setItem('inspire-favs', JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { setIndex(0) }, [category])

  useEffect(() => {
    if (copied) { const t = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(t) }
  }, [copied])

  const toggleFav = useCallback(() => {
    if (!quote) return
    setFavorites(prev => isFav ? prev.filter(t => t !== quote.text) : [...prev, quote.text])
  }, [quote, isFav])

  const copyQuote = useCallback(() => {
    if (!quote) return
    navigator.clipboard.writeText(`"${quote.text}" \u2014 ${quote.author}`).then(() => setCopied(true)).catch(() => {})
  }, [quote])

  const nextQuote = useCallback(() => {
    if (quotes.length > 0) setIndex(prev => (prev + 1) % quotes.length)
  }, [quotes.length])

  if (quotes.length === 0) return null

  return (
    <div className="app" style={{ background: `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)` }}>
      <div className="container">
        <h1 className="title">Inspire</h1>

        <div className="tabs">
          {catKeys.map(key => (
            <button
              key={key}
              className={`tab ${key === category ? 'tab-active' : ''}`}
              onClick={() => setCategory(key)}
            >
              <span className="tab-emoji">{categories[key].emoji}</span>
              <span className="tab-label">{categories[key].label}</span>
            </button>
          ))}
        </div>

        <div className="card">
          <span className="quote-marks" style={{ color: g1 }}>❝❞</span>
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

          {copied && <p className="copied-feedback" style={{ color: g1 }}>✅ Copied to clipboard!</p>}

          <p className="quote-count">{quotes.length} quotes in this category</p>
        </div>

        <button className="next-btn" onClick={nextQuote} style={{ color: g1 }}>
          Next Quote
        </button>
      </div>
    </div>
  )
}
