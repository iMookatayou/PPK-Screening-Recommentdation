// app/layout.tsx  (ไม่มี "use client")
import type { Metadata } from 'next'
import './styles/globals.css'
import { Geist, Geist_Mono } from 'next/font/google'
import AppLayoutWrapper from './AppLayoutWrapper'
import { ToastProvider } from '@/app/components/ui/popup/ToastProvider'
import { AuthProvider } from '@/app/context/AuthContext'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PPK Pre-Service Health Screening System',
  description: 'ระบบตรวจคัดกรองสุขภาพก่อนรับบริการ โรงพยาบาลพระปกเกล้า',
  icons: { icon: '/images/logoppk4.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable}`}>
        <body>

          <ToastProvider>
            <AuthProvider>
              <AppLayoutWrapper>{children}</AppLayoutWrapper>
            </AuthProvider>
          </ToastProvider>

          {/* จุดยึดให้ portal (จะอยู่ท้าย body เสมอ) */}
          <div id="modal-root" />
        </body>

    </html>
  )
}
