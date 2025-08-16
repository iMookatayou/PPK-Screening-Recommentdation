// app/components/internal/ModalPortal.tsx
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  children: React.ReactNode
  selector?: string          // เริ่มต้น "#modal-root"
  lockScroll?: boolean       // ล็อกสกรอลล์เมื่อมองเห็นพอร์ทัลนี้
}

export default function ModalPortal({ children, selector = '#modal-root', lockScroll = false }: Props) {
  const [mountEl, setMountEl] = useState<Element | null>(null)
  const createdRef = useRef(false)

  // สร้าง container ถ้าไม่พบ และเก็บเป็น mount target
  useEffect(() => {
    let target = document.querySelector(selector)
    if (!target) {
      const el = document.createElement('div')
      // ถ้า selector เป็น id (#id) → ตั้ง id ให้เลย
      const m = selector.match(/^#([\w-]+)$/)
      if (m) el.id = m[1]
      document.body.appendChild(el)
      target = el
      createdRef.current = true
    }
    setMountEl(target!)

    return () => {
      // ถ้าเราเป็นคนสร้าง element นี้เอง ค่อยลบตอน unmount
      if (createdRef.current && target && target.parentElement) {
        target.parentElement.removeChild(target)
      }
    }
  }, [selector])

  // ล็อกสกรอลล์ (optional)
  useEffect(() => {
    if (!lockScroll || !mountEl) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [lockScroll, mountEl])

  if (!mountEl) return null
  return createPortal(children, mountEl)
}
