import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-zinc-950 text-zinc-100 p-6 text-center select-none">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 shadow-xl">
            <AlertTriangle size={32} />
          </div>

          <h2 className="text-xl font-bold text-zinc-100 mb-2">
            Terjadi Kesalahan Tampilan
          </h2>

          <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
            Aplikasi mengalami kendala tak terduga. Klik tombol di bawah untuk memulihkan sesi Anda.
          </p>

          {this.state.error?.message && (
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-6 text-left">
              <p className="text-[11px] font-mono text-rose-300 break-words line-clamp-3">
                {this.state.error.toString()}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700/60"
            >
              <Home size={14} />
              <span>Coba Lagi</span>
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <RefreshCw size={14} />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
