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
import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo'
import LoadingDots from '@/app/components/ui/LoadingDots'

// ใช้ Sanctum (cookie-based)
import {
  api,              // axios instance with withCredentials=true
  fetchMe,          // GET /api/me
  ensureCsrfCookie, // GET /sanctum/csrf-cookie
  logoutSession,    // POST /logout
} from '@/lib/axios'

interface AuthContextType {
  user: any
  loading: boolean
  isAuthenticated: boolean
  token: string | null
  // NOTE: เก็บ signature เดิมไว้เพื่อไม่ให้โค้ดส่วนอื่นพัง
  // ในโหมด Sanctum จะ "ไม่ใช้" token / expiresAt
  login: (token: string | null, user: any, expiresAt?: string | null) => void
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

// เส้นทางที่ไม่ต้องล็อกอิน
const publicPaths = new Set<string>(['/login', '/register', '/unauthorized'])
const DEFAULT_AFTER_LOGIN = '/erdsppk'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // โหมด Sanctum จะไม่มี token ให้เก็บ
  const [token] = useState<string | null>(null)

  const [mounted, setMounted] = useState(false) // กัน SSR

  const router = useRouter()
  const pathname = usePathname()
  const isPublic = publicPaths.has(pathname)

  const initializedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      // เรียก logout ฝั่งเซิร์ฟเวอร์ (idempotent)
      await ensureCsrfCookie().catch(() => {})
      await logoutSession().catch(() => {})
    } catch {
      // เงียบ ๆ ได้
    }

    setUser(null)
    try {
      // sync ข้ามแท็บ
      localStorage.setItem('auth_event', JSON.stringify({ type: 'LOGOUT', at: Date.now() }))
    } catch {}

    if (!isPublic) {
      router.replace('/login')
    }
  }, [isPublic, router])

  // login(): คง signature เดิมไว้ แต่ใน Sanctum จะ “สนใจเฉพาะ user”
  const login = useCallback(
    (_token: string | null, userObj: any, _expiresAt?: string | null) => {
      setUser(userObj)

      try {
        // sync ข้ามแท็บ
        localStorage.setItem('auth_event', JSON.stringify({ type: 'LOGIN', at: Date.now() }))
      } catch {}

      if (isPublic) {
        router.replace(DEFAULT_AFTER_LOGIN)
      }
    },
    [isPublic, router]
  )

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const me = await fetchMe()
      setUser(me)
    } catch {
      // 401/419 → ถือว่าไม่ได้ล็อกอิน
      setUser(null)
      if (!publicPaths.has(window.location.pathname)) {
        router.replace('/login')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  // init ครั้งแรก: พยายามดึง me จาก session cookie
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    ;(async () => {
      setLoading(true)
      try {
        // ไม่จำเป็นต้องเรียก csrf ในการ GET /me
        await refreshUser()
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshUser])

  // เปลี่ยนหน้า: ถ้าไม่ได้ล็อกอินและหน้าไม่ public → เด้งไป /login
  // ถ้าล็อกอินแล้วแต่ไปหน้า public → เด้งไปหน้าในระบบ
  useEffect(() => {
    if (loading || !mounted) return

    if (user && isPublic) {
      router.replace(DEFAULT_AFTER_LOGIN)
    }
    if (!user && !isPublic) {
      router.replace('/login')
    }
  }, [user, loading, isPublic, mounted, router])

  // ซิงก์สถานะข้ามแท็บ
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'auth_event' || !e.newValue) return
      try {
        const payload = JSON.parse(e.newValue)
        if (payload.type === 'LOGOUT') {
          setUser(null)
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

  // เงื่อนไขการแสดง overlay
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
        token,       // จะเป็น null เสมอในโหมด Sanctum
        login,       // ใช้แค่อาร์กิวเมนต์ตัวที่ 2 (user)
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255,255,255,0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        gap: 12,
      }}
    >
      <AnimatedLogo />

      <div
        style={{
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          visibility: 'visible',
          opacity: 1,
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
