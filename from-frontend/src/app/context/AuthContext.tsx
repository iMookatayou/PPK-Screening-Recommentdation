// src/app/context/AuthContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo'
import LoadingDots from '@/app/components/ui/LoadingDots'

// Sanctum (cookie-based)
import {
  fetchMe,          // GET /api/me
  ensureCsrfCookie, // GET /sanctum/csrf-cookie
  logoutSession,    // POST /api/logout (ยิงผ่าน ROOT ใน axios.ts)
} from '@/lib/axios'

/* ========================= Types ========================= */
type Role = 'user' | 'admin' | 'staff' | string
type Status = 'pending' | 'approved' | 'rejected' | string
export interface ApiUser {
  id: number
  cid: string
  first_name: string
  last_name: string
  email: string
  role: Role
  status: Status
}

interface AuthContextType {
  user: ApiUser | null
  loading: boolean
  isAuthenticated: boolean
  token: string | null
  // คง signature เดิมเพื่อไม่ให้โค้ดส่วนอื่นพัง (โหมด Sanctum ไม่ใช้ token/expiresAt)
  login: (token: string | null, user: ApiUser, expiresAt?: string | null) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

/* ========================= Config ========================= */

// เส้นทางที่ไม่ต้องล็อกอิน
const publicPaths = new Set<string>(['/login', '/register', '/unauthorized'])
const DEFAULT_AFTER_LOGIN = '/erdsppk'

/* ========================= Context ========================= */

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  token: null,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)
  const token: string | null = null // โหมด Sanctum: ไม่มี token

  const [mounted, setMounted] = useState(false) // กัน SSR mismatch

  const router = useRouter()
  const pathname = usePathname()
  const isPublic = publicPaths.has(pathname)

  // กัน init เรียกซ้ำ & กัน redirect loop
  const initializedRef = useRef(false)
  const lastRedirectRef = useRef<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await ensureCsrfCookie().catch(() => {})
      await logoutSession().catch(() => {})
    } catch {
      // เงียบได้
    }

    setUser(null)

    try {
      localStorage.setItem('auth_event', JSON.stringify({ type: 'LOGOUT', at: Date.now() }))
    } catch {}

    if (!isPublic) {
      if (lastRedirectRef.current !== '/login') {
        lastRedirectRef.current = '/login'
        router.replace('/login')
      }
    }
  }, [isPublic, router])

  // login(): คง signature เดิมไว้ แต่โหมด Sanctum ใช้เฉพาะ user
  const login = useCallback(
    (_token: string | null, userObj: ApiUser, _expiresAt?: string | null) => {
      setUser(userObj)

      try {
        localStorage.setItem('auth_event', JSON.stringify({ type: 'LOGIN', at: Date.now() }))
      } catch {}

      if (isPublic) {
        if (lastRedirectRef.current !== DEFAULT_AFTER_LOGIN) {
          lastRedirectRef.current = DEFAULT_AFTER_LOGIN
          router.replace(DEFAULT_AFTER_LOGIN)
        }
      }
    },
    [isPublic, router]
  )

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const me = (await fetchMe()) as ApiUser
      setUser(me)
    } catch {
      // 401/419 → ถือว่าไม่ได้ล็อกอิน
      setUser(null)
      if (typeof window !== 'undefined' && !publicPaths.has(window.location.pathname)) {
        if (lastRedirectRef.current !== '/login') {
          lastRedirectRef.current = '/login'
          router.replace('/login')
        }
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
        await refreshUser()
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshUser])

  // เปลี่ยนหน้า: ถ้าไม่ได้ล็อกอินและหน้าไม่ public → เด้ง /login
  // ถ้าล็อกอินแล้วแต่ไปหน้า public → เด้งไปหน้าในระบบ
  useEffect(() => {
    if (!mounted || loading) return

    if (user && isPublic) {
      if (lastRedirectRef.current !== DEFAULT_AFTER_LOGIN) {
        lastRedirectRef.current = DEFAULT_AFTER_LOGIN
        router.replace(DEFAULT_AFTER_LOGIN)
      }
      return
    }
    if (!user && !isPublic) {
      if (lastRedirectRef.current !== '/login') {
        lastRedirectRef.current = '/login'
        router.replace('/login')
      }
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
            if (lastRedirectRef.current !== '/login') {
              lastRedirectRef.current = '/login'
              router.replace('/login')
            }
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

  // ✅ ให้เป็น boolean ชัดเจน (แก้ error boolean | null)
  const showOverlay: boolean =
    Boolean(
      loading ||
      (!user && !isPublic) ||
      (!!user && isPublic)
    )

  // ส่งค่า boolean ล้วน
  const open = Boolean(mounted && showOverlay)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        token,       // null เสมอในโหมด Sanctum
        login,       // ใช้แค่อาร์กิวเมนต์ตัวที่ 2 (user)
        logout,
        refreshUser,
      }}
    >
      {/* แสดง Layout/Children ตลอด — Topbar/Sidebar ไม่หาย */}
      {children}

      {/* Overlay ผ่าน Portal หลัง mount เพื่อกัน hydration mismatch */}
      <FullPageOverlay open={open} />
    </AuthContext.Provider>
  )
}

/** Overlay ผ่าน portal; ถ้าไม่มี #modal-root จะ fallback ไป body */
function FullPageOverlay({ open }: { open: boolean }) {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const host = document.getElementById('modal-root') || document.body
    setPortalHost(host)
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
