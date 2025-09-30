'use client'

import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import TopNavbar from './components/TopNavbar/TopNavbar'
import Sidebar from './components/sidebar/Sidebar'
import type { ThaiIDData } from '@/types/globalType'

/** ========= Config ========= */
// ใช้ env ถ้ามี; ถ้าไม่ให้ fallback เป็น http://localhost:5000
const CARD_API_BASE =
  (process.env.NEXT_PUBLIC_CARD_API && process.env.NEXT_PUBLIC_CARD_API.trim()) ||
  'http://localhost:5000'

const CHECK_INTERVAL = 3000
const FETCH_TIMEOUT_MS = 2500

/** ========= ThaiID Context ========= */
type ReaderStatus = 'reading' | 'ready' | 'error'

const ThaiIDContext = createContext<{
  data: ThaiIDData | null
  loading: boolean
  error: string | null
  status: ReaderStatus
  lastUpdatedAt: number | null
  resetData: () => void
  refreshCardData: () => void
}>({
  data: null,
  loading: true,
  error: null,
  status: 'reading',
  lastUpdatedAt: null,
  resetData: () => {},
  refreshCardData: () => {},
})

export const useThaiID = () => useContext(ThaiIDContext)

/** ========= Provider ========= */
export const ThaiIDProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<ThaiIDData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ReaderStatus>('reading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)

  const lastCID = useRef<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resetData = () => {
    cleanup()
    setData(null)
    setLoading(true)
    setError(null)
    setStatus('reading')
    lastCID.current = null
    startCardReading()
  }

  const refreshCardData = () => {
    resetData()
  }

  const fetchCardData = async () => {
    if (!CARD_API_BASE) {
      setError('Card API URL is not set in .env')
      setStatus('error')
      setLoading(false)
      return
    }

    // ใช้ AbortController + ใส่เหตุผลตอน abort เพื่อกัน “signal is aborted without reason”
    const ctrl = new AbortController()
    const tid = setTimeout(
      () => ctrl.abort(new DOMException('Timeout', 'AbortError')),
      FETCH_TIMEOUT_MS
    )

    try {
      const url = `${CARD_API_BASE}/get_cid_data?callback=cb&section1=true&section2a=true&section2c=true`
      const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal })

      if (!res.ok) {
        throw new Error(`Card API HTTP ${res.status}`)
      }

      const text = await res.text()

      // รองรับ JSONP /**/cb({...}); และกรณี backend ส่ง JSON ตรง ๆ
      const m = text.match(/^\/\*\*\/cb\(([\s\S]*?)\);\s*$/)
      const payload = m ? m[1] : text
      const card = JSON.parse(payload)

      // ยังไม่เสียบบัตร
      if (!card || !card.CitizenID) {
        setLoading(false)
        setStatus('reading')
        setError(null) // ถือว่าเป็นสถานะอ่านต่อ ไม่ใช่ error
        return
      }

      // กันอัพเดตรัวๆ ซ้ำบัตรเดิม
      if (card.CitizenID === lastCID.current) {
        setLoading(false)
        setStatus('ready')
        setError(null)
        return
      }
      lastCID.current = card.CitizenID

      setData({
        titleNameTh: card.TitleNameTh ?? '',
        firstNameTh: card.FirstNameTh ?? '',
        lastNameTh: card.LastNameTh ?? '',
        birthDate: card.BirthDate ?? '',
        gender: card.Gender ?? '',
        cid: card.CitizenID ?? '',
        address: {
          Full: card.Full ?? '',
          HouseNo: card.HouseNo ?? '',
          Moo: card.Moo ?? '',
          Tumbol: card.Tumbol ?? '',
          Amphur: card.Amphur ?? '',
          Province: card.Province ?? '',
        },
        issueDate: card.IssueDate ?? '',
        expiryDate: card.ExpireDate ?? '',
        photo: card.PhotoBase64 ?? '',
        primary_province_name: card.Province ?? '',
        primary_amphur_name: card.Amphur ?? '',
        primary_tumbon_name: card.Tumbol ?? '',
        primary_mooban_name: card.Moo ?? '',
      })

      setLastUpdatedAt(Date.now())
      setLoading(false)
      setError(null)
      setStatus('ready')
    } catch (err: any) {
      // timeout / abort → ไม่ต้องเด้งเป็น error
      if (err?.name === 'AbortError') {
        setLoading(false)
        setStatus('reading')
        return
      }
      console.error('Failed to fetch card data:', err)
      setError('เชื่อมต่อ Card Reader ไม่ได้')
      setLoading(false)
      setStatus('error')
    } finally {
      clearTimeout(tid) // กัน abort ยิงทีหลังเมื่อสำเร็จแล้ว
    }
  }

  const startCardReading = () => {
    cleanup()
    fetchCardData() // ดึงครั้งแรกทันที
    intervalRef.current = setInterval(fetchCardData, CHECK_INTERVAL)
  }

  useEffect(() => {
    startCardReading()
    return cleanup
  }, [])

  return (
    <ThaiIDContext.Provider
      value={{ data, loading, error, status, lastUpdatedAt, resetData, refreshCardData }}
    >
      {children}
    </ThaiIDContext.Provider>
  )
}

/** ========= Helpers ========= */
function maskCID(cid: string) {
  if (!cid || cid.length < 13) return cid
  return `${cid.slice(0, 1)}-${'*'.repeat(7)}-${cid.slice(8, 10)}-${'*'.repeat(3)}-${cid.slice(12)}`
}
function formatTime(ts: number | null) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString('th-TH', { hour12: false })
}
function toDataUrlMaybe(base64?: string | null) {
  if (!base64) return null
  const s = base64.trim()
  return s ? (s.startsWith('data:image') ? s : `data:image/jpeg;base64,${s}`) : null
}

/** ========= Portal Utils ========= */
function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}
function Portal({ children }: { children: ReactNode }) {
  const mounted = useMounted()
  if (!mounted) return null
  return createPortal(children, document.body)
}

/** ========= Motion Card + FAB ========= */
const STORAGE_KEY = 'cardStatusCollapsed'

const CardReaderStatus: React.FC = () => {
  const { data, status, error, lastUpdatedAt, refreshCardData } = useThaiID()

  // อ่านค่าตั้งแต่ initial render (lazy init) และตั้งค่าเริ่มต้นให้ "หุบ" เสมอถ้าไม่มีค่า
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? raw === '1' : true
    } catch {
      return true
    }
  })

  // เซฟค่าเมื่อเปลี่ยน
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {}
  }, [collapsed])

  // (ออปชัน) sync ระหว่างหลายแท็บ/หน้าต่าง
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue != null) {
        setCollapsed(e.newValue === '1')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const tone = {
    bg: status === 'ready' ? 'bg-green-600' : status === 'error' ? 'bg-red-600' : 'bg-gray-700',
    border: status === 'ready' ? 'border-green-700' : status === 'error' ? 'border-red-700' : 'border-gray-600',
    ring: status === 'ready' ? 'ring-green-400/50' : status === 'error' ? 'ring-red-400/50' : 'ring-white/20',
    fab: status === 'ready' ? 'bg-green-600 hover:bg-green-700' : status === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-800',
  }

  const photoUrl = toDataUrlMaybe(data?.photo)
  const text =
    status === 'ready' && data
      ? `${data.titleNameTh}${data.firstNameTh} ${data.lastNameTh} • ${maskCID(data?.cid ?? '')}`
      : 'กำลังอ่านบัตรประชาชน...'

  const Avatar = (
    <div className="relative shrink-0">
      <div className={`rounded-full p-[2px] ring-4 ${tone.ring}`}>
        <div className="rounded-full overflow-hidden bg-black/20 size-10 grid place-items-center">
          <AnimatePresence mode="wait" initial={false}>
            {status === 'ready' && photoUrl ? (
              <motion.img
                key={`img-${lastUpdatedAt ?? 'x'}`}
                src={photoUrl}
                alt="card holder"
                className="size-10 object-cover"
                initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
              />
            ) : status === 'error' ? (
              <motion.svg
                key="warn"
                viewBox="0 0 24 24"
                className="h-6 w-6 text-white"
                fill="none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
              >
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            ) : (
              <motion.svg
                key="spinner"
                viewBox="0 0 24 24"
                className="h-6 w-6 text-white"
                fill="none"
                initial={{ opacity: 0, rotate: -30 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 480, damping: 30 }}
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                </path>
              </motion.svg>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )

  return (
    <Portal>
      <div className="fixed bottom-4 right-4 z-[120]">
        <AnimatePresence initial={false} mode="wait">
          {/* FAB */}
          {collapsed && (
            <motion.button
              key="fab"
              type="button"
              onClick={() => setCollapsed(false)}
              className={`h-12 w-12 rounded-full ${tone.fab} text-white shadow-xl grid place-items-center`}
              aria-label="เปิดสถานะผู้อ่านบัตร"
              title="เปิดสถานะผู้อ่านบัตร"
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <div className={`rounded-full p-[2px] ring-4 ${tone.ring}`}>
                <div className="rounded-full bg-white/20 size-9 grid place-items-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                </div>
              </div>
            </motion.button>
          )}

          {/* Panel */}
          {!collapsed && (
            <motion.div
              key="panel"
              className={`flex items-center gap-3 text-white ${tone.bg} border ${tone.border} shadow-xl rounded-2xl p-3 min-w-[300px] max-w-[460px]`}
              initial={{ opacity: 0, x: 40, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              layout
            >
              {Avatar}

              <div className="flex-1">
                <div className="font-medium leading-tight line-clamp-1">
                  {status === 'ready' && data
                    ? `${data.titleNameTh}${data.firstNameTh} ${data.lastNameTh} • ${maskCID(data?.cid ?? '')}`
                    : 'กำลังอ่านบัตรประชาชน...'}
                </div>
                <div className="text-white/80 text-xs mt-0.5">
                  {status === 'ready' && lastUpdatedAt ? `อัปเดตล่าสุด: ${formatTime(lastUpdatedAt)}` : null}
                  {status === 'reading' ? 'โปรดเสียบบัตร หรือรอระบบอ่านข้อมูล' : null}
                  {status === 'error' && (error || 'เกิดข้อผิดพลาดในการอ่านบัตร')}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={refreshCardData}
                  className="rounded-lg border border-white/30 px-2 py-1 text-xs hover:bg-white/10 active:scale-[0.98] transition"
                  title="รีเฟรชการอ่านบัตร"
                >
                  รีเฟรช
                </button>
                <button
                  onClick={() => setCollapsed(true)}
                  className="rounded-lg border border-white/30 px-2 py-1 text-xs hover:bg-white/10 active:scale-[0.98] transition"
                  aria-label="ซ่อนแถบสถานะ"
                  title="ซ่อนแถบสถานะ"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Portal>
  )
}

/** ========= Layout ========= */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathnameRaw = usePathname()
  const pathname = pathnameRaw ?? ''
  const layoutExcludedPaths = ['/login', '/register', '/print-form']
  const isExcluded = layoutExcludedPaths.some((path) => pathname.startsWith(path))

  const [selected, setSelected] = useState<number[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null
  if (isExcluded) return <>{children}</>

  return (
    <ThaiIDProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <div className="sticky top-0 z-[100]">
          <TopNavbar />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-[260px] shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto z-[90]">
            <Sidebar selected={selected} setSelected={setSelected} setShowRightPanel={() => {}} />
          </aside>

          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[--background] text-[--foreground] p-4">
            <div className="w-full max-w-none">{children}</div>
          </main>
        </div>
      </div>

      <CardReaderStatus />
    </ThaiIDProvider>
  )
}
