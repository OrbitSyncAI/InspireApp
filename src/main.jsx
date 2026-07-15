import React, { Component } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'

class AppErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('InspireApp page error:', error) }
  render() {
    if (this.state.error) return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui' }}>
        <section style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1>Something went wrong</h1><p>The app is safe. Return to Home and try again.</p>
          <button onClick={() => { this.setState({ error: null }); window.location.hash = ''; window.location.reload() }}>Open Home</button>
        </section>
      </main>
    )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppErrorBoundary><App /></AppErrorBoundary>)
