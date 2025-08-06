'use client'

import { usePathname } from 'next/navigation'
import ClientLayout from './ClientLayout'

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // path ที่ไม่ต้องการให้มี Navbar/Sidebar
  const standalonePaths = ['/dashboard', '/printsummary']
  const isStandalone = standalonePaths.some((p) => pathname.startsWith(p))

  if (isStandalone) {
    // หน้า standalone → แสดง children ตรง ๆ
    return <>{children}</>
  }

  // หน้าอื่น → ใช้ ClientLayout (AuthProvider อยู่แล้วใน RootLayout)
  return <ClientLayout>{children}</ClientLayout>
}
