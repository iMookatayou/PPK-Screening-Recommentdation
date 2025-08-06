'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authAxios } from '@/lib/axios'

interface AuthContextType {
  user: any
  loading: boolean
  isAuthenticated: boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  logout: () => {},
  refreshUser: async () => {},
})

const publicPaths = ['/login', '/register']

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const pathname = usePathname()

  // ✅ logout = clear token และ redirect
  const logout = useCallback(() => {
    console.warn('[AUTH] Logging out...')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)

    if (!publicPaths.includes(pathname)) {
      router.replace('/login')
    }
  }, [pathname, router])

  // ✅ refresh user จาก /api/me
  const refreshUser = useCallback(async () => {
    setLoading(true)

    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('[AUTH] No token in localStorage')
      logout()
      setLoading(false)
      return
    }

    try {
      const res = await authAxios().get('/api/me')
      setUser(res.data)
    } catch (err) {
      console.error('[AUTH] /me failed, logging out')
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout])

  // ✅ ทำงานตอนเปลี่ยน path
  useEffect(() => {
    const token = localStorage.getItem('token')
    console.log('[AUTH] Token on load:', token)

    if (!token && !publicPaths.includes(pathname)) {
      logout()
      return
    }

    if (publicPaths.includes(pathname)) {
      setLoading(false)
      return
    }

    refreshUser()
  }, [pathname, refreshUser])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        logout,
        refreshUser,
      }}
    >
      {loading ? <p>กำลังตรวจสอบสิทธิ์...</p> : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
