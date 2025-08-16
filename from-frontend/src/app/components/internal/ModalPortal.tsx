// app/components/internal/ModalPortal.tsx
'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mount, setMount] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setMount(document.getElementById('modal-root') ?? document.body)
  }, [])
  if (!mount) return null
  return createPortal(children, mount)
}
