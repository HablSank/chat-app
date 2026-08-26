import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const res = await login(username, password)
    if (!res.success) {
      setError(res.error)
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center min-h-screen bg-zinc-950 p-4"
    >
      <div className="w-full max-w-sm p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">Welcome Back</h1>
          <p className="text-sm text-zinc-400 mt-2">Sign in to continue chatting</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              placeholder="johndoe"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-2xl transition-colors disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Sign up
          </button>
        </p>
      </div>
    </motion.div>
  )
}
