import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ping_app_theme') || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    localStorage.setItem('ping_app_theme', theme)
    const root = document.documentElement

    if (theme === 'light') {
      root.classList.add('light', 'light-theme')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light', 'light-theme')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
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
