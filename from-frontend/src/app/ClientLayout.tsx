'use client'

import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import TopNavbar from './components/topbar/TopNavbar'
import Sidebar from './components/sidebar/Sidebar'
import type { ThaiIDData } from '@/app/types/globalType'

/** ENV เป็น string | undefined เสมอ -> guard เวลาใช้งาน */
const CARD_API = process.env.NEXT_PUBLIC_CARD_API
const CHECK_INTERVAL = 3000

/* =============================
   ThaiID Context
   ============================= */
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

/* =============================
   Provider
   ============================= */
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
    const base = CARD_API
    if (!base) {
      setError('Card API URL is not set in .env')
      setStatus('error')
      setLoading(false)
      return
    }

    try {
      const url = `${base}/get_cid_data?callback=cb&section1=true&section2a=true&section2c=true`
      const res = await fetch(url, { cache: 'no-store' })
      const text = await res.text()
      const jsonText = text.replace(/^\/\*\*\/cb\((.*)\);?$/, '$1')
      const card = JSON.parse(jsonText)

      if (!card || !card.CitizenID) {
        setLoading(false)
        setStatus('reading')
        return
      }

      if (card.CitizenID === lastCID.current) {
        setLoading(false)
        setStatus('ready')
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
    } catch (err) {
      console.error('Failed to fetch card data:', err)
      setError('เชื่อมต่อ Card Reader ไม่ได้')
      setLoading(false)
      setStatus('error')
    }
  }

  const startCardReading = () => {
    cleanup()
    fetchCardData()
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

/* =============================
   UI: Card Reader Status Toast
   ============================= */
function maskCID(cid: string) {
  if (!cid || cid.length < 13) return cid
  return `${cid.slice(0, 1)}-${'*'.repeat(7)}-${cid.slice(8, 10)}-${'*'.repeat(3)}-${cid.slice(12)}`
}

function formatTime(ts: number | null) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString('th-TH', { hour12: false })
}

const CardReaderStatus: React.FC = () => {
  const { data, status, error, lastUpdatedAt, refreshCardData } = useThaiID()

  let bg = 'bg-gray-700'
  let border = 'border-gray-600'
  let text = 'กำลังอ่านบัตรประชาชน...'
  let icon = (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" />
    </svg>
  )

  if (status === 'ready' && data) {
    bg = 'bg-green-600'
    border = 'border-green-700'
    text = `${data.titleNameTh}${data.firstNameTh} ${data.lastNameTh} • ${maskCID(data?.cid ?? '')}`
    icon = (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (status === 'error') {
    bg = 'bg-red-600'
    border = 'border-red-700'
    icon = (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[120]">
      <div className={`flex items-start gap-3 text-white ${bg} border ${border} shadow-lg rounded-xl p-3 min-w-[280px] max-w-[420px]`}>
        <div className="mt-1">{icon}</div>
        <div className="flex-1">
          <div className="font-medium leading-tight">{text}</div>
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
        </div>
      </div>
    </div>
  )
}

/* =============================
   Layout
   ============================= */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathnameRaw = usePathname()
  const pathname = pathnameRaw ?? ''
  const layoutExcludedPaths = ['/login', '/register', '/print-form']
  const isExcluded = layoutExcludedPaths.some((path) => pathname.startsWith(path))

  const [selected, setSelected] = useState<number[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
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
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>

      <CardReaderStatus />
    </ThaiIDProvider>
  )
}
