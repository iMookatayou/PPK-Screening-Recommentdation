// app/layout.tsx
import type { Metadata } from 'next'
import './styles/globals.css'
import { Geist, Geist_Mono } from 'next/font/google'
import AppLayoutWrapper from './AppLayoutWrapper'
import { ToastProvider } from '@/app/components/ui/ToastProvider'
import { AuthProvider } from '@/app/context/AuthContext' 

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ระบบคัดกรองผู้ป่วย',
  description: 'ระบบคัดกรองและลงทะเบียนผู้ป่วย รพ.พระปกเกล้า',
  icons: { icon: '/images/logoppk4.png' }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ToastProvider>
          {/*  นำ AuthProvider เข้ามาหุ้ม AppLayoutWrapper */}
          <AuthProvider>
            <AppLayoutWrapper>{children}</AppLayoutWrapper>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}