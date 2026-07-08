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
  const quote = quotes[index]
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
    navigator.clipboard.writeText(`"${quote.text}" — ${quote.author}`).then(() => setCopied(true))
  }, [quote])

  const nextQuote = useCallback(() => {
    setIndex(prev => (prev + 1) % quotes.length)
  }, [quotes.length])

  return (
    <div className="app" style={{ '--g1': g1, '--g2': g2 }}>
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
          <span className="quote-marks">❝❞</span>
          <p className="quote-text">{quote.text}</p>
          <div className="divider" />
          <p className="quote-author">— {quote.author}</p>

          <div className="actions">
            <button className="action-btn" onClick={toggleFav} title={isFav ? 'Remove favorite' : 'Add favorite'}>
              {isFav ? '❤️' : '🤍'}
            </button>
            <button className="action-btn" onClick={copyQuote} title="Copy to clipboard">
              📋
            </button>
          </div>

          {copied && <p className="copied-feedback">✅ Copied to clipboard!</p>}

          <p className="quote-count">{quotes.length} quotes in this category</p>
        </div>

        <button className="next-btn" onClick={nextQuote}>
          Next Quote
        </button>
      </div>
    </div>
  )
}
