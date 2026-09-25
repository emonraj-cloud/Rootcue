import { createContext, useContext, useEffect, useState } from 'react'
import { api, saveToken, clearToken, getStoredToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }

    api
      .get('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api.post('/api/auth/login', { email, password }, { auth: false })
    saveToken(data.token)
    setUser(data.user)
  }

  async function register(name, email, password) {
    const data = await api.post('/api/auth/register', { name, email, password }, { auth: false })
    saveToken(data.token)
    setUser(data.user)
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  function updateUser(updatedUser) {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
