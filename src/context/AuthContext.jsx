import { createContext, useState, useEffect, useContext } from 'react'
import { getApiUrl } from '../config/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for existing session
    const storedToken = localStorage.getItem('chat_token')
    const storedUser = localStorage.getItem('chat_user')
    
    if (storedToken) {
      setToken(storedToken)
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch (e) {
          console.error('Failed to parse user from localStorage', e)
        }
      }

      // Fetch fresh profile state from backend
      fetch(getApiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error('Session expired')
        })
        .then((freshUser) => {
          localStorage.setItem('chat_user', JSON.stringify(freshUser))
          setUser(freshUser)
        })
        .catch((err) => {
          console.warn('Auth check warning:', err.message)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }

      localStorage.setItem('chat_token', data.token)
      localStorage.setItem('chat_user', JSON.stringify(data.user))
      
      setToken(data.token)
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const register = async (username, password) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      localStorage.setItem('chat_token', data.token)
      localStorage.setItem('chat_user', JSON.stringify(data.user))
      sessionStorage.setItem('ping_first_time_signup', 'true')
      
      setToken(data.token)
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('chat_token')
    localStorage.removeItem('chat_user')
    setToken(null)
    setUser(null)
  }

  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser }
    localStorage.setItem('chat_user', JSON.stringify(merged))
    setUser(merged)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
