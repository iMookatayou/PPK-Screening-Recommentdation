'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import styles from './styles/Register.module.css'
import { api } from '@/lib/axios'
import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo'
import { IdCard, Mail, User, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'

/** Popup: ใช้ mapper + popup เดียวกับหน้า Login */
import ReusablePopup from '@/app/components/ui/popup/ReusablePopup'
import {
  makeUserStatusPopupMapper,
  createDefaultPopupActionRunner,
  type ApiResponse,
} from '@/app/components/ui/popup/userStatusPopupMapper'

/** ใช้ logout จาก AuthContext เพื่อเคลียร์ session เวลากด REAPPLY */
import { useAuth } from '@/app/context/AuthContext'

/** แถวอินพุตพร้อม motion ที่ wrapper (ไม่ animate ที่ input เพื่อความลื่น + ไอคอนไม่หาย) */
function InputRow({
  icon,
  rightAddon,
  inputProps,
}: {
  icon: React.ReactNode
  rightAddon?: React.ReactNode
  inputProps: React.InputHTMLAttributes<HTMLInputElement>
}) {
  const [focused, setFocused] = useState(false)

  return (
    <motion.div
      className={styles.inputGroup}
      animate={focused ? { scale: 1.02, y: -2 } : { scale: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
    >
      {icon}
      <input
        {...inputProps}
        className={styles.animatedInput}
        onFocus={(e) => {
          setFocused(true)
          inputProps.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          inputProps.onBlur?.(e)
        }}
      />
      {rightAddon}
    </motion.div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { logout } = useAuth()

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
  const [error, setError] = useState<string>('')

  const isSubmitting = useRef(false)

  /** state + mapper สำหรับ Popup */
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupProps, setPopupProps] = useState<any>(null)

  // ✅ ส่ง logout เข้า runner ด้วย (สำหรับปุ่ม REAPPLY ให้เคลียร์ session ก่อน)
  const runAction = createDefaultPopupActionRunner((url) => router.push(url), logout)
  const mapToPopup = makeUserStatusPopupMapper(runAction)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'cid') {
      setFormData((p) => ({ ...p, cid: value.replace(/\D/g, '').slice(0, 13) }))
      return
    }
    setFormData((p) => ({ ...p, [name]: value }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting.current || loading || finished) return
    isSubmitting.current = true
    setError('')

    // normalize email ก่อน validate/ส่ง
    const email = formData.email.trim().toLowerCase()

    // validate ฝั่ง FE (ฝั่ง BE ยังตรวจซ้ำอีกชั้น)
    if (!/^\d{13}$/.test(formData.cid)) {
      setError('เลขบัตรประชาชนต้องมี 13 หลัก')
      isSubmitting.current = false
      return
    }
    if (!email) {
      setError('กรุณากรอกอีเมล')
      isSubmitting.current = false
      return
    }
    if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง (ต้องมี @ อย่างน้อย)')
      isSubmitting.current = false
      return
    }
    if (!formData.first_name.trim()) {
      setError('กรุณากรอกชื่อ')
      isSubmitting.current = false
      return
    }
    if (!formData.last_name.trim()) {
      setError('กรุณากรอกนามสกุล')
      isSubmitting.current = false
      return
    }
    if (formData.password.length < 8 || !/\d/.test(formData.password)) {
      setError('รหัสผ่านอย่างน้อย 8 ตัวและมีตัวเลขอย่างน้อย 1 ตัว')
      isSubmitting.current = false
      return
    }
    if (formData.password !== formData.password_confirmation) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน')
      isSubmitting.current = false
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/register', {
        ...formData,
        email, // ส่งตัวที่ trim/lower แล้ว
      })

      if (res.status === 201) {
        setFinished(true)
        setTimeout(() => setFadeOut(true), 1600)
        setTimeout(() => router.push('/login'), 2000)
      }
    } catch (err: any) {
      /** จัดการ 422 Validation จาก Laravel (errors: { field: [msg] }) */
      if (err?.response?.status === 422 && err?.response?.data?.errors) {
        const errors = err.response.data.errors as Record<string, string[]>
        const firstMsg = Object.values(errors)[0]?.[0]
        setError(firstMsg || 'ข้อมูลไม่ถูกต้อง')
      } else {
        // ถ้า backend ส่ง payload ตามสัญญา (code/message/actions) → โชว์ popup
        const code = err?.response?.data?.code as string | undefined
        const msg = err?.response?.data?.message as string | undefined

        if (code && msg) {
          const apiPayload = err.response.data as ApiResponse
          const mapped = mapToPopup(apiPayload)
          setPopupProps(mapped)
          setPopupOpen(true)
        } else {
          // fallback ปกติ
          setError(err?.response?.data?.message || err?.response?.data?.error || 'สมัครสมาชิกไม่สำเร็จ')
        }
      }
    } finally {
      isSubmitting.current = false
      setLoading(false)
    }
  }

  return (
    <div className={styles.registerBackground}>
      <div className={styles.container}>
        <div className={styles.registerCard}>
          <div className={styles.left}>
            {/* Loading state */}
            {loading && !finished && (
              <>
                <AnimatedLogo />
                <div
                  style={{
                    marginTop: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    className={styles.loader}
                  />
                  <p className={styles.loadingText}>กำลังสมัครสมาชิก...</p>
                </div>
              </>
            )}

            {/* Form */}
            {!loading && !finished && (
              <>
                <AnimatedLogo />

                <div className={styles.registerHeader}>
                  <h2>REGISTER P P K</h2>
                </div>

                <div className={styles.form}>
                  <InputRow
                    icon={<IdCard className={styles.icon} size={18} />}
                    inputProps={{
                      type: 'text',
                      name: 'cid',
                      placeholder: 'เลขบัตรประชาชน (CID)',
                      value: formData.cid,
                      onChange,
                      onKeyDown: handleKeyPress,
                      inputMode: 'numeric',
                      maxLength: 13,
                      required: true,
                    }}
                  />

                  <InputRow
                    icon={<User className={styles.icon} size={18} />}
                    inputProps={{
                      type: 'text',
                      name: 'first_name',
                      placeholder: 'ชื่อ (First name)',
                      value: formData.first_name,
                      onChange,
                      onKeyDown: handleKeyPress,
                      required: true,
                    }}
                  />

                  <InputRow
                    icon={<User className={styles.icon} size={18} />}
                    inputProps={{
                      type: 'text',
                      name: 'last_name',
                      placeholder: 'นามสกุล (Last name)',
                      value: formData.last_name,
                      onChange,
                      onKeyDown: handleKeyPress,
                      required: true,
                    }}
                  />

                  <InputRow
                    icon={<Mail className={styles.icon} size={18} />}
                    inputProps={{
                      type: 'email',
                      name: 'email',
                      placeholder: 'อีเมล',
                      value: formData.email,
                      onChange,
                      onKeyDown: handleKeyPress,
                      inputMode: 'email',
                      required: true, 
                    }}
                  />

                  <InputRow
                    icon={<KeyRound className={styles.icon} size={18} />}
                    rightAddon={
                      <span
                        className={styles.togglePassword}
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </span>
                    }
                    inputProps={{
                      type: showPassword ? 'text' : 'password',
                      name: 'password',
                      placeholder: 'รหัสผ่าน (อย่างน้อย 8 ตัว มีตัวเลข)',
                      value: formData.password,
                      onChange,
                      onKeyDown: handleKeyPress,
                      required: true,
                    }}
                  />

                  <InputRow
                    icon={<KeyRound className={styles.icon} size={18} />}
                    inputProps={{
                      type: showPassword ? 'text' : 'password',
                      name: 'password_confirmation',
                      placeholder: 'ยืนยันรหัสผ่าน',
                      value: formData.password_confirmation,
                      onChange,
                      onKeyDown: handleKeyPress,
                      required: true,
                    }}
                  />

                  {error && <p className={styles.error}>{error}</p>}

                  <button
                    className={styles.primaryBtn}
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    สมัครสมาชิก
                  </button>

                  <p className={styles.registerLinkWrapper}>
                    มีบัญชีแล้ว?
                    <Link className={styles.registerLink} href="/login">
                      เข้าสู่ระบบ
                    </Link>
                  </p>
                </div>
              </>
            )}

            {/* Success */}
            {finished && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: fadeOut ? 0 : 1 }}
                transition={{ duration: 0.4 }}
                className={styles.successContainer}
              >
                <motion.div
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <CheckCircle className={styles.successIcon} />
                </motion.div>
                <h2 className={styles.successMessage}>สมัครสำเร็จ!</h2>
                <p className={styles.successSubtext}>กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {popupProps && (
        <ReusablePopup
          {...(() => {
            // ตัด open ที่อาจเผลอปนมาจาก mapper ออก เพื่อกัน override
            const { open: _drop, ...rest } = popupProps || {}
            return rest
          })()}
          open={Boolean(popupOpen && popupProps)}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </div>
  )
}
