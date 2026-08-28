import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Phase 15.39: Locked strictly to 'dark' while Light Mode is under maintenance
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('ping_app_theme', 'dark')
    const root = document.documentElement
    root.classList.add('dark')
    root.classList.remove('light', 'light-theme')
  }, [])

  const toggleTheme = () => {
    // Under maintenance - locked to dark
  }

  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme, toggleTheme, isDark: true, customTheme: null }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
