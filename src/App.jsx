import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout from './components/AppLayout'
import Login from './components/Login'
import Register from './components/Register'

function AuthRouter() {
  const { user, isLoading } = useAuth()
  const [showRegister, setShowRegister] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-zinc-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <AppLayout />
  }

  return (
    <AnimatePresence mode="wait">
      {showRegister ? (
        <Register key="register" onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <Login key="login" onSwitchToRegister={() => setShowRegister(true)} />
      )}
    </AnimatePresence>
  )
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AuthRouter />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
