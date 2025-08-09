'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import styles from './styles/Register.module.css'
import { api } from '@/lib/axios'
import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo'
import { IdCard, Mail, User, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    cid: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'cid') {
      return setFormData(p => ({ ...p, cid: value.replace(/\D/g, '').slice(0, 13) }))
    }
    setFormData(p => ({ ...p, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // validate ง่าย ๆ ให้เหมือนหน้า login
    if (!/^\d{13}$/.test(formData.cid)) return setError('เลขบัตรประชาชนต้องมี 13 หลัก')
    if (formData.password.length < 8 || !/\d/.test(formData.password)) {
      return setError('รหัสผ่านอย่างน้อย 8 ตัวและมีตัวเลขอย่างน้อย 1 ตัว')
    }
    if (formData.password !== formData.password_confirmation) {
      return setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน')
    }

    try {
      setLoading(true)
      const res = await api.post('/register', formData)
      if (res.status === 201) {
        setFinished(true)
        setTimeout(() => setFadeOut(true), 1200)
        setTimeout(() => router.push('/login'), 1600)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.registerBackground}>
      <div className={styles.container}>
        <div className={styles.registerCard}>
          <div className={styles.left}>
            {!finished ? (
              <>
                <div className={styles.logoWrapper}>
                  <AnimatedLogo />
                </div>

                <div className={styles.registerHeader}>
                  <h2>REGISTER P P K</h2>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                  {/* CID */}
                  <div className={styles.inputGroup}>
                    <IdCard className={styles.icon} size={18} />
                    <motion.input
                      className={styles.animatedInput}
                      type="text"
                      name="cid"
                      placeholder="เลขบัตรประชาชน (CID)"
                      value={formData.cid}
                      onChange={onChange}
                      inputMode="numeric"
                      maxLength={13}
                      whileFocus={{ scale: 1.03, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      required
                    />
                  </div>

                  {/* First name */}
                  <div className={styles.inputGroup}>
                    <User className={styles.icon} size={18} />
                    <motion.input
                      className={styles.animatedInput}
                      type="text"
                      name="first_name"
                      placeholder="ชื่อ (First name)"
                      value={formData.first_name}
                      onChange={onChange}
                      whileFocus={{ scale: 1.03, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      required
                    />
                  </div>

                  {/* Last name */}
                  <div className={styles.inputGroup}>
                    <User className={styles.icon} size={18} />
                    <motion.input
                      className={styles.animatedInput}
                      type="text"
                      name="last_name"
                      placeholder="นามสกุล (Last name)"
                      value={formData.last_name}
                      onChange={onChange}
                      whileFocus={{ scale: 1.03, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      required
                    />
                  </div>

                  {/* Email (optional) */}
                  <div className={styles.inputGroup}>
                    <Mail className={styles.icon} size={18} />
                    <motion.input
                      className={styles.animatedInput}
                      type="email"
                      name="email"
                      placeholder="อีเมล (ไม่บังคับ)"
                      value={formData.email}
                      onChange={onChange}
                      whileFocus={{ scale: 1.03, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    />
                  </div>

                  {/* Password */}
                  <div className={styles.inputGroup}>
                    <KeyRound className={styles.icon} size={18} />
                    <motion.input
                      className={styles.animatedInput}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว มีตัวเลข)"
                      value={formData.password}
                      onChange={onChange}
                      whileFocus={{ scale: 1.03, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      required
                    />
                    <span className={styles.togglePassword} onClick={() => setShowPassword(s => !s)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </span>
                  </div>

                  {/* Confirm Password */}
                  <div className={styles.inputGroup}>
                    <KeyRound className={styles.icon} size={18} />
                    <motion.input
                      className={styles.animatedInput}
                      type={showPassword ? 'text' : 'password'}
                      name="password_confirmation"
                      placeholder="ยืนยันรหัสผ่าน"
                      value={formData.password_confirmation}
                      onChange={onChange}
                      whileFocus={{ scale: 1.03, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      required
                    />
                  </div>

                  {error && <p className={styles.error}>{error}</p>}

                  <button className={styles.primaryBtn} type="submit" disabled={loading}>
                    {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
                  </button>
                  <p className={styles.registerLinkWrapper}>
                    มีบัญชีแล้ว?
                    <a className={styles.registerLink} href="/login">
                      เข้าสู่ระบบ
                    </a>
                  </p>
                </form>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: fadeOut ? 0 : 1 }}
                transition={{ duration: 0.4 }}
                className={styles.successContainer}
              >
                <CheckCircle className={styles.successIcon} />
                <h2 className={styles.successMessage}>สมัครสำเร็จ!</h2>
                <p className={styles.successSubtext}>โปรดรอผู้ดูแลระบบอนุมัติ แล้วเข้าสู่ระบบอีกครั้ง</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
