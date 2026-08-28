import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Ping! ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 text-center select-none">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Terjadi Kesalahan / An Error Occurred</h2>
          <p className="text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
            Aplikasi mengalami kendala saat memuat data. Silakan muat ulang halaman.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Muat Ulang Aplikasi / Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
