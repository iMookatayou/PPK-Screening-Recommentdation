'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import ClientLayout from './ClientLayout'

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStandalone = useMemo(() => {
    const bases = ['/login', '/register', '/printsummary']
    return bases.some((p) => pathname === p || pathname.startsWith(p + '/'))
  }, [pathname])

  return isStandalone ? <>{children}</> : <ClientLayout>{children}</ClientLayout>
}
