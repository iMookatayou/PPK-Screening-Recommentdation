'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import styles from './styles/Register.module.css'
import { api, ensureCsrfCookie } from '@/lib/axios'
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

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
type FormState = {
  cid: string
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
}

type ValidatedForm = FormState & { email: string }

/* ------------------------------------------------------------------ */
/* Lightweight Logger (frontend)                                       */
/* ------------------------------------------------------------------ */
type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug'
const LOG_LEVEL: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'debug'

const levelPriority: Record<Exclude<LogLevel, 'silent'>, number> = {
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
}

function canLog(level: Exclude<LogLevel, 'silent'>) {
  if (LOG_LEVEL === 'silent') return false
  if (LOG_LEVEL === 'error') return level === 'error'
  return (
    levelPriority[level] <=
      levelPriority[LOG_LEVEL as Exclude<LogLevel, 'silent'>] ||
    LOG_LEVEL === 'debug'
  )
}

const maskEmail = (email: string) => {
  const [name, domain = ''] = email.split('@')
  if (!name) return email
  const head = name.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(0, name.length - 2))}@${domain}`
}
const maskCID = (cid: string) => {
  if (!cid) return cid
  const head = cid.slice(0, 3)
  const tail = cid.slice(-2)
  return `${head}${'*'.repeat(Math.max(0, cid.length - 5))}${tail}`
}

const log = {
  debug: (...args: any[]) => canLog('debug') && console.debug('[REG]', ...args),
  info: (...args: any[]) => canLog('info') && console.info('[REG]', ...args),
  warn: (...args: any[]) => canLog('warn') && console.warn('[REG]', ...args),
  error: (...args: any[]) => canLog('error') && console.error('[REG]', ...args),
}

function withGroupCollapsed(title: string, fn: () => void) {
  if (canLog('debug') || canLog('info') || canLog('warn') || canLog('error')) {
    console.groupCollapsed(title)
    try {
      fn()
    } finally {
      console.groupEnd()
    }
  } else {
    fn()
  }
}

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
          log.debug('Input focus:', inputProps.name)
          setFocused(true)
          inputProps.onFocus?.(e)
        }}
        onBlur={(e) => {
          log.debug('Input blur:', inputProps.name)
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

  const [formData, setFormData] = useState<FormState>({
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
  const runAction = createDefaultPopupActionRunner(
    (url) => {
      log.info('Popup runAction → navigate:', url)
      router.push(url)
    },
    () => {
      log.info('Popup runAction → logout session before REAPPLY')
      logout()
    }
  )
  const mapToPopup = makeUserStatusPopupMapper(runAction)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === 'cid') {
      const next = value.replace(/\D/g, '').slice(0, 13)
      setFormData((p) => ({ ...p, cid: next }))
      if (next.length === 13) {
        log.info('CID filled to 13 digits:', maskCID(next))
      } else {
        log.debug('CID typing:', maskCID(next))
      }
      return
    }

    if (name === 'email') {
      log.debug('Email typing:', maskEmail(value))
    } else if (name === 'first_name' || name === 'last_name') {
      log.debug(`${name} typing:`, value.trim() ? '(non-empty)' : '(empty)')
    } else if (name === 'password' || name === 'password_confirmation') {
      log.debug(`${name} typing:`, '(masked)')
    }

    setFormData((p) => ({ ...p, [name]: value }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      log.info('KeyPress: Enter → submit')
      e.preventDefault()
      handleSubmit()
    }
  }

  /* -------------------------------------------------------------- */
  /* validate(): คืนค่าเป็น ValidatedForm | null (ไม่ใช้ true/false) */
  /* -------------------------------------------------------------- */
  const validate = (): ValidatedForm | null => {
    // normalize email
    const email = formData.email.trim().toLowerCase()

    const fail = (msg: string, code: string) => {
      withGroupCollapsed('Validation fail', () => {
        log.warn('code:', code)
        log.warn('message:', msg)
        log.warn('snapshot:', {
          cid: maskCID(formData.cid),
          email: maskEmail(email),
          first_name: !!formData.first_name.trim(),
          last_name: !!formData.last_name.trim(),
          password_len: formData.password.length,
          password_confirmation_len: formData.password_confirmation.length,
        })
      })
      setError(msg)
      return null
    }

    if (!/^\d{13}$/.test(formData.cid)) {
      return fail('เลขบัตรประชาชนต้องมี 13 หลัก', 'E_CID_LENGTH')
    }
    if (!email) {
      return fail('กรุณากรอกอีเมล', 'E_EMAIL_EMPTY')
    }
    if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
      return fail('รูปแบบอีเมลไม่ถูกต้อง (ต้องมี @ อย่างน้อย)', 'E_EMAIL_FORMAT')
    }
    if (!formData.first_name.trim()) {
      return fail('กรุณากรอกชื่อ', 'E_FIRSTNAME_EMPTY')
    }
    if (!formData.last_name.trim()) {
      return fail('กรุณากรอกนามสกุล', 'E_LASTNAME_EMPTY')
    }
    if (formData.password.length < 8 || !/\d/.test(formData.password)) {
      return fail(
        'รหัสผ่านอย่างน้อย 8 ตัวและมีตัวเลขอย่างน้อย 1 ตัว',
        'E_PASSWORD_WEAK'
      )
    }
    if (formData.password !== formData.password_confirmation) {
      return fail('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'E_PASSWORD_NOT_MATCH')
    }

    // สำเร็จ → คืน object ที่แน่นอน (TS รู้ว่ามี email)
    return { ...formData, email }
  }

  const handleSubmit = async () => {
    if (isSubmitting.current || loading || finished) {
      log.debug('Submit ignored (isSubmitting/loading/finished)')
      return
    }

    isSubmitting.current = true
    setError('')

    const validated = validate()
    if (!validated) {
      isSubmitting.current = false
      return
    }

    const { email } = validated
    const perfStart = 'register_start'
    const perfEnd = 'register_end'
    try {
      setLoading(true)
      performance.mark(perfStart)
      withGroupCollapsed('Register submit → request', () => {
        log.info('POST /register')
        log.info('payload (masked):', {
          cid: maskCID(formData.cid),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: maskEmail(email),
          password_len: formData.password.length,
        })
      })

      await ensureCsrfCookie();
       const res = await api.post('/register', {
        ...formData,
        email, // ส่งตัวที่ trim/lower แล้ว
      })

      log.info('Response status:', res.status)
      if (res.status === 201) {
        log.info('Register success → show success screen then redirect /login')
        setFinished(true)
        setTimeout(() => setFadeOut(true), 1600)
        setTimeout(() => router.push('/login'), 2000)
      } else {
        log.warn('Unexpected status:', res.status)
      }
    } catch (err: any) {
      withGroupCollapsed('Register submit → error', () => {
        const status = err?.response?.status
        log.error('HTTP status:', status)

        /** 422 validation จาก Laravel */
        if (status === 422 && err?.response?.data?.errors) {
          const errors = err.response.data.errors as Record<string, string[]>
          const firstMsg = Object.values(errors)[0]?.[0]
          log.warn('422 fields:', Object.keys(errors))
          log.warn('422 first message:', firstMsg)
          setError(firstMsg || 'ข้อมูลไม่ถูกต้อง')
          return
        }

        // สัญญา code/message/actions → popup
        const code = err?.response?.data?.code as string | undefined
        const msg = err?.response?.data?.message as string | undefined

        if (code && msg) {
          log.info('API contract error → popup', { code, message: msg })
          const apiPayload = err.response.data as ApiResponse
          const mapped = mapToPopup(apiPayload)
          setPopupProps(mapped)
          setPopupOpen(true)
        } else {
          const fallback =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            'สมัครสมาชิกไม่สำเร็จ'
          log.warn('Fallback error:', fallback)
          setError(fallback)
        }
      })
    } finally {
      performance.mark(perfEnd)
      try {
        performance.measure('register_total', perfStart, perfEnd)
        const measures = performance.getEntriesByName('register_total')
        if (measures[0]) {
          log.info(`Register total: ${Math.round(measures[0].duration)} ms`)
        }
        performance.clearMarks(perfStart)
        performance.clearMarks(perfEnd)
        performance.clearMeasures('register_total')
      } catch {}
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
                        onClick={() => {
                          const next = !showPassword
                          setShowPassword(next)
                          log.info(
                            'Toggle password visibility:',
                            next ? 'SHOW' : 'HIDE'
                          )
                        }}
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
                    <Link
                      className={styles.registerLink}
                      href="/login"
                      onClick={() => log.info('Navigate → /login (link)')}
                    >
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
          onClose={() => {
            log.info('Popup closed')
            setPopupOpen(false)
          }}
        />
      )}
    </div>
  )
}
