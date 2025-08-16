'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { authAxios, setAuthHeader } from '@/lib/axios'
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

  // กัน window/document ตอน SSR
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
    setAuthHeader(undefined)
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
      setAuthHeader(rawToken)
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
      setAuthHeader(undefined)
      setLoading(false)
      return
    }

    try {
      setAuthHeader(tokenFromStorage)
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
      setAuthHeader(undefined)
      setLoading(false)
      return
    }

    setAuthHeader(tokenFromStorage)
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
          setAuthHeader(undefined)
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

  // เงื่อนไขการแสดง overlay (logical เท่านั้น)
  const showOverlay =
    loading ||
    (!user && !isPublic) ||
    (user && isPublic)

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
      {/* แสดง Layout/Children ตลอด — Topbar/Sidebar ไม่หาย */}
      {children}

      {/* Overlay ผ่าน Portal หลัง mount เพื่อกัน hydration mismatch */}
      <FullPageOverlay open={mounted && showOverlay} />
    </AuthContext.Provider>
  )
}

/** Overlay แบบ Method B: จองพื้นที่ LoadingDots + คุมด้วย visibility/opacity */
function FullPageOverlay({ open }: { open: boolean }) {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // หลัง mount ค่อยหา #modal-root
    setPortalHost(document.getElementById('modal-root'))
  }, [])

  if (!portalHost || !open) return null

  return createPortal(
    <div
      // ไม่มี suppressHydrationWarning ก็ได้ เพราะไม่ SSR เลย
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255,255,255,0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        gap: 12, // เว้นช่องโลโก้กับจุดๆ
      }}
    >
      <AnimatedLogo />

      {/* Container ของแถวจุด: สูงคงที่เสมอ ป้องกัน layout shift */}
      <div
        style={{
          height: 28,            // ปรับตามความสูงจริงของ LoadingDots (เช่น 24–32)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          visibility: 'visible', // ถ้าวันไหนอยากซ่อน ให้สลับ visible/hidden
          opacity: 1,            // ถ้าจะเฟด: 0 -> 1
          transition: 'opacity 200ms ease',
        }}
      >
        <LoadingDots />
      </div>
    </div>,
    portalHost
  )
}

export const useAuth = () => useContext(AuthContext)
