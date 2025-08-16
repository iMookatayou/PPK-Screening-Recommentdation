'use client'

import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import TopNavbar from './components/topbar/TopNavbar'
import Sidebar from './components/sidebar/Sidebar'
import type { ThaiIDData } from '@/app/types/globalType'

const CARD_API = process.env.NEXT_PUBLIC_CARD_API
const CHECK_INTERVAL = 3000

const ThaiIDContext = createContext<{
  data: ThaiIDData | null
  loading: boolean
  error: string | null
  resetData: () => void
  refreshCardData: () => void
}>({
  data: null,
  loading: true,
  error: null,
  resetData: () => {},
  refreshCardData: () => {},
})

export const useThaiID = () => useContext(ThaiIDContext)

export const ThaiIDProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<ThaiIDData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    lastCID.current = null
    startCardReading()
  }

  const refreshCardData = () => {
    resetData()
  }

  const fetchCardData = async () => {
    if (!CARD_API) {
      setError('Card API URL is not set in .env')
      return
    }

    try {
      const res = await fetch(
        `${CARD_API}/get_cid_data?callback=cb&section1=true&section2a=true&section2c=true`
      )
      const text = await res.text()
      const jsonText = text.replace(/^\/\*\*\/cb\((.*)\);$/, '$1')
      const card = JSON.parse(jsonText)

      if (!card || !card.CitizenID) return
      if (card.CitizenID === lastCID.current) return
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

      setLoading(false)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch card data:', err)
      setError('Failed to connect to card reader API')
    }
  }

  const startCardReading = () => {
    cleanup()
    fetchCardData()
    intervalRef.current = setInterval(fetchCardData, CHECK_INTERVAL)
  }

  useEffect(() => {
    startCardReading()
    return () => cleanup()
  }, [])

  return (
    <ThaiIDContext.Provider value={{ data, loading, error, resetData, refreshCardData }}>
      {children}
    </ThaiIDContext.Provider>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const layoutExcludedPaths = ['/login', '/register', '/print-form']
  const isExcluded = layoutExcludedPaths.some((path) => pathname.startsWith(path))

  const [selected, setSelected] = useState<number[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  if (isExcluded) return <>{children}</>

  return (
    <ThaiIDProvider>
      {/* โครงหลัก */}
      <div className="min-h-screen flex flex-col bg-white">
        {/* ให้ topbar อยู่เหนือ content แต่ไม่สูงเกิน overlay */}
        <div className="sticky top-0 z-[100]">
          <TopNavbar />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* sidebar: z-index ต่ำกว่า topbarนิดหน่อย */}
          <aside className="w-[260px] shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto z-[90]">
            <Sidebar selected={selected} setSelected={setSelected} setShowRightPanel={() => {}} />
          </aside>

          {/* content: หลีกเลี่ยง transform/filter/opacity ที่สร้าง stacking context */}
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[--background] text-[--foreground] p-4">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ThaiIDProvider>
  )
}