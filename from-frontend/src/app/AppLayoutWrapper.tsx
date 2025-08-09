'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import ClientLayout from './ClientLayout'

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

  }, [])

  if (!isClient) return null

  const standalonePaths = ['/dashboard', '/printsummary']
  const isStandalone = standalonePaths.some((p) => pathname.startsWith(p))

  if (isStandalone) return <>{children}</>

  return <ClientLayout>{children}</ClientLayout>
}
