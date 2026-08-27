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
    <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center relative overflow-y-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-0 w-[350px] sm:w-[500px] lg:w-[800px] h-[350px] sm:h-[500px] lg:h-[800px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[350px] sm:w-[500px] lg:w-[800px] h-[350px] sm:h-[500px] lg:h-[800px] bg-violet-500/10 blur-[140px] rounded-full pointer-events-none translate-x-1/3 translate-y-1/3"></div>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 xl:gap-28 items-center z-10 my-auto">
        {/* Left Column: Hero & Branding */}
        <div className="flex flex-col justify-center items-center p-2 sm:p-4 lg:p-0 text-center lg:text-left lg:items-start">
          <motion.img 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            src="/logo.png" 
            alt="Ping! Logo" 
            className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 xl:w-48 xl:h-48 object-contain mb-3 sm:mb-6 lg:mb-8 drop-shadow-2xl"
          />
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight mb-2 sm:mb-4 pt-1 sm:pt-2 pb-2 sm:pb-5 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-violet-400 to-zinc-100"
          >
            Ping!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-xl lg:text-2xl xl:text-3xl text-zinc-400 max-w-xl font-medium leading-relaxed"
          >
            Fast, minimal, and secure real-time chat.
          </motion.p>
        </div>

        {/* Right Column: Auth Card */}
        <div className="flex items-center justify-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-md lg:max-w-lg xl:max-w-xl p-6 sm:p-10 lg:p-12 xl:p-14 bg-zinc-900/60 border border-zinc-800 backdrop-blur-md rounded-3xl shadow-2xl"
          >
            <div className="text-center mb-6 sm:mb-8 lg:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-100">Welcome Back</h2>
              <p className="text-xs sm:text-base lg:text-lg text-zinc-400 mt-1.5 sm:mt-2">Sign in to continue chatting</p>
            </div>

            {error && (
              <div className="mb-5 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-base rounded-2xl text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-1 sm:mb-1.5 ml-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 sm:px-5 py-2.5 sm:py-3.5 lg:py-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm sm:text-base"
                  placeholder="johndoe"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-1 sm:mb-1.5 ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 sm:px-5 py-2.5 sm:py-3.5 lg:py-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm sm:text-base"
                  placeholder="••••••••"
                  required
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 sm:py-4 lg:py-4.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm sm:text-lg rounded-2xl transition-colors disabled:opacity-50 mt-3 sm:mt-4 shadow-lg shadow-indigo-500/25"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </motion.button>
            </form>

            <p className="text-center text-xs sm:text-base text-zinc-500 mt-5 sm:mt-6 lg:mt-8">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
