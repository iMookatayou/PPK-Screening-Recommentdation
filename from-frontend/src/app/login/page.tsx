'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/axios' // ✅ ใช้สำหรับ login-token
import { useAuth } from '@/app/context/AuthContext'
import styles from './styles/Login.module.css'
import { User, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)

  const passwordRef = useRef<HTMLInputElement>(null)
  const isLoggingIn = useRef(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [searchParams])

  const handleLogin = async () => {
    if (isLoggingIn.current) return
    isLoggingIn.current = true
    setError('')

    if (!email || !password) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      isLoggingIn.current = false
      return
    }

    try {
      // ✅ POST login-token
      const res = await api.post('/api/login-token', { email, password })

      const { access_token, user } = res.data

      // ✅ เก็บ token และ user ใน localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user))

      // ✅ ดึงข้อมูล /me
      await refreshUser()

      // ✅ แสดง success
      setFinished(true)

      setTimeout(() => router.push('/erdsppk'), 1500)
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err)
      setError(err.response?.data?.message || 'เข้าสู่ระบบล้มเหลว')
    } finally {
      isLoggingIn.current = false
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className={styles.loginBackground}>
      <div className={styles.container}>
        <div className={styles.loginCard}>
          {!finished && (
            <div className={styles.left}>
              <AnimatedLogo />
              <div className={styles.loginHeader}>
                <h2>LOGIN TO P P K</h2>
              </div>

              {/* Email */}
              <div className={styles.inputGroup}>
                <User className={styles.icon} size={18} />
                <motion.input
                  type="email"
                  placeholder="อีเมล (Email)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyPress}
                  whileFocus={{ scale: 1.03, y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className={styles.animatedInput}
                />
              </div>

              {/* Password */}
              <div className={styles.inputGroup}>
                <KeyRound className={styles.icon} size={18} />
                <motion.input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="รหัสผ่าน (Password)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyPress}
                  whileFocus={{ scale: 1.03, y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className={styles.animatedInput}
                />
                <span
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </span>
              </div>

              <button onClick={handleLogin}>เข้าสู่ระบบ</button>
              {error && <p className={styles.error}>{error}</p>}
            </div>
          )}

          {finished && (
            <motion.div
              className={styles.successContainer}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ rotate: -90 }}
                animate={{ rotate: 0 }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircle className={styles.successIcon} />
              </motion.div>
              <h2 className={styles.successMessage}>เข้าสู่ระบบสำเร็จ!</h2>
              <p className={styles.successSubtext}>กำลังนำคุณไปยังหน้าคัดกรอง...</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
