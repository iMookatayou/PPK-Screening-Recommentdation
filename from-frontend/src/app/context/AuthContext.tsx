// 'use client'

// import {
//   createContext,
//   useContext,
//   useEffect,
//   useState,
//   useCallback,
//   useRef,
// } from 'react'
// import { useRouter, usePathname } from 'next/navigation'
// import { authAxios } from '@/lib/axios'
// import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo'
// import { motion } from 'framer-motion'

// interface AuthContextType {
//   user: any
//   loading: boolean
//   isAuthenticated: boolean
//   token: string | null
//   logout: () => void
//   refreshUser: () => Promise<void>
// }

// const AuthContext = createContext<AuthContextType>({
//   user: null,
//   loading: true,
//   isAuthenticated: false,
//   token: null, 
//   logout: () => {},
//   refreshUser: async () => {},
// })

// const publicPaths = ['/login', '/register']

// export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
//   const [user, setUser] = useState<any>(null)
//   const [loading, setLoading] = useState(true)
//   const [token, setToken] = useState<string | null>(null) 
//   const initializedRef = useRef(false)

//   const router = useRouter()
//   const pathname = usePathname()

//   const logout = useCallback(() => {
//     console.warn('[AUTH] Logging out...')
//     localStorage.removeItem('token')
//     localStorage.removeItem('user')
//     setUser(null)
//     setToken(null) 
//     setLoading(false)

//     if (!publicPaths.includes(pathname)) {
//       router.replace('/login')
//     }
//   }, [pathname, router])

//   const refreshUser = useCallback(async () => {
//     setLoading(true)

//     const tokenFromStorage = localStorage.getItem('token')
//     if (!tokenFromStorage) {
//       logout()
//       setLoading(false)
//       return
//     }

//     try {
//       const res = await authAxios().get('/api/me')
//       setUser(res.data)
//       setToken(tokenFromStorage) 
//     } catch (err) {
//       console.error('[AUTH] /me failed:', err)
//       logout()
//     } finally {
//       setLoading(false)
//     }
//   }, [logout])

//   useEffect(() => {
//     if (initializedRef.current) return
//     initializedRef.current = true

//     const tokenFromStorage = localStorage.getItem('token')
//     console.log('[AUTH] Token on load:', tokenFromStorage)

//     if (!tokenFromStorage) {
//       if (!publicPaths.includes(pathname)) {
//         setLoading(false)
//         logout()
//         return
//       }
//       setLoading(false)
//       return
//     }

//     refreshUser()
//   }, [pathname, refreshUser, logout])

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         loading,
//         isAuthenticated: !!user,
//         token, 
//         logout,
//         refreshUser,
//       }}
//     >
//       {loading && pathname === '/login' ? (
//         <motion.div
//           initial={{ opacity: 0, y: -10 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//           style={{
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             justifyContent: 'center',
//             minHeight: '100vh',
//             textAlign: 'center',
//             backgroundColor: '#fff',
//           }}
//         >
//           <AnimatedLogo />
//           <p style={{ fontSize: '1.2rem', marginTop: '1rem', color: '#333' }}>
//             กำลังตรวจสอบสิทธิ์...
//           </p>
//         </motion.div>
//       ) : (
//         children
//       )}
//     </AuthContext.Provider>
//   )
// }

// export const useAuth = () => useContext(AuthContext)

'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authAxios } from '@/lib/axios'
import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo'
import LoadingDots from '@/app/components/ui/LoadingDots'

interface AuthContextType {
  user: any
  loading: boolean
  isAuthenticated: boolean
  token: string | null
  login: (token: string, user: any, expiresAt?: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  token: null,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
})

const publicPaths = new Set<string>(['/login', '/register', '/unauthorized'])
const STORAGE_TOKEN_KEY = 'token'
const STORAGE_USER_KEY = 'user'
const STORAGE_EXP_KEY = 'token_expires_at'
const DEFAULT_AFTER_LOGIN = '/erdsppk'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const isPublic = publicPaths.has(pathname)

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const clearLogoutTimer = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY)
      localStorage.removeItem(STORAGE_USER_KEY)
      localStorage.removeItem(STORAGE_EXP_KEY)
    } catch {}

    setUser(null)
    setToken(null)
    setLoading(false)
    clearLogoutTimer()

    try {
      localStorage.setItem('auth_event', JSON.stringify({ type: 'LOGOUT', at: Date.now() }))
    } catch {}

    if (!isPublic) {
      router.replace('/login')
    }
  }, [isPublic, router])

  const scheduleAutoLogout = useCallback(
    (expiresAt?: string | null) => {
      clearLogoutTimer()
      if (!expiresAt) return
      const expMs = new Date(expiresAt).getTime()
      const delta = expMs - Date.now()
      if (Number.isNaN(expMs) || delta <= 0) return
      logoutTimerRef.current = setTimeout(() => logout(), delta)
    },
    [logout]
  )

  const login = useCallback(
    (rawToken: string, userObj: any, expiresAt?: string) => {
      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, rawToken)
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj))
        if (expiresAt) localStorage.setItem(STORAGE_EXP_KEY, expiresAt)
      } catch {}

      setToken(rawToken)
      setUser(userObj)
      scheduleAutoLogout(expiresAt)

      try {
        localStorage.setItem('auth_event', JSON.stringify({ type: 'LOGIN', at: Date.now() }))
      } catch {}

      if (isPublic) {
        router.replace(DEFAULT_AFTER_LOGIN)
      }
    },
    [isPublic, router, scheduleAutoLogout]
  )

  const refreshUser = useCallback(async () => {
    setLoading(true)
    const tokenFromStorage = localStorage.getItem(STORAGE_TOKEN_KEY)
    if (!tokenFromStorage) {
      setLoading(false)
      return
    }

    try {
      const res = await authAxios.get('/me')
      setUser(res.data)
      setToken(tokenFromStorage)
      scheduleAutoLogout(localStorage.getItem(STORAGE_EXP_KEY) || undefined)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout, scheduleAutoLogout])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const tokenFromStorage = localStorage.getItem(STORAGE_TOKEN_KEY)
    const exp = localStorage.getItem(STORAGE_EXP_KEY)

    if (!tokenFromStorage) {
      setLoading(false)
      return
    }

    refreshUser()
    scheduleAutoLogout(exp)
  }, [refreshUser, scheduleAutoLogout])

  useEffect(() => {
    if (loading || !mounted) return

    if (user && isPublic) {
      router.replace(DEFAULT_AFTER_LOGIN)
    }
    if (!user && !isPublic) {
      router.replace('/login')
    }
  }, [user, loading, isPublic, mounted, router])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'auth_event' || !e.newValue) return
      try {
        const payload = JSON.parse(e.newValue)
        if (payload.type === 'LOGOUT') {
          setUser(null)
          setToken(null)
          clearLogoutTimer()
          if (!publicPaths.has(window.location.pathname)) {
            router.replace('/login')
          }
        }
        if (payload.type === 'LOGIN') {
          refreshUser()
        }
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refreshUser, router])

  const canShowChildren = mounted && !loading && (isPublic || !!user)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        token,
        login,
        logout,
        refreshUser,
      }}
    >
      {canShowChildren ? (
        children
      ) : (
        <div
          suppressHydrationWarning
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            backgroundColor: '#fff',
          }}
        >
          <AnimatedLogo />
          <LoadingDots />
        </div>
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
