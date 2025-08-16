// app/components/overlay/SafePortal.tsx
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function SafePortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // target ถูกคำนวณครั้งเดียว ไม่เปลี่ยนระหว่างชีวิตคอมโพเนนต์
  const host = useMemo(
    () => (typeof document === 'undefined' ? null : document.getElementById('overlay-root')),
    []
  )

  // container เฉพาะ instance นี้ (ไม่แชร์กัน)
  const containerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!host || containerRef.current) return
    const el = document.createElement('div')
    el.setAttribute('data-portal-container', 'true')
    host.appendChild(el)
    containerRef.current = el
    return () => {
      const node = containerRef.current
      if (node && node.parentNode === host) host.removeChild(node) // เช็ค parent ก่อนลบ
      containerRef.current = null
    }
  }, [host])

  if (!mounted || !host || !containerRef.current) return null
  return createPortal(children, containerRef.current)
}
