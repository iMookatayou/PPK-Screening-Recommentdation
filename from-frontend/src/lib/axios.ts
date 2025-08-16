// src/lib/axios.ts
import axios, {
  AxiosInstance,
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios'

// ---- Base URL (เติม /api ให้อัตโนมัติ) ----
const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL
if (!rawBase) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL not defined in .env')
}
const baseURL = (() => {
  const trimmed = rawBase.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
})()

// ---- Helpers ----
function ensureAxiosHeaders(config: InternalAxiosRequestConfig): AxiosHeaders {
  const h = config.headers
  if (!h) {
    const ah = new AxiosHeaders()
    config.headers = ah
    return ah
  }
  if (h instanceof AxiosHeaders) return h
  const ah = AxiosHeaders.from(h) // แปลง plain object → AxiosHeaders
  config.headers = ah
  return ah
}

function setJsonHeaders(config: InternalAxiosRequestConfig) {
  const headers = ensureAxiosHeaders(config)

  // อย่าทับ header ที่ caller ตั้งมาเอง
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  // ถ้าเป็น FormData → ปล่อยให้ browser ใส่ boundary เอง (ไม่เซ็ต Content-Type)
  const isForm =
    typeof FormData !== 'undefined' && config.data instanceof FormData

  if (!headers.has('Content-Type') && !isForm) {
    headers.set('Content-Type', 'application/json')
  }
}

function normalizeAxiosError(error: AxiosError) {
  // ไม่เปลี่ยน shape ของ error (เพื่อไม่กระทบ handler เดิม) — แค่ปรับ message ให้อ่านง่ายขึ้น
  if (error.code === 'ECONNABORTED') {
    error.message ||= 'คำขอหมดเวลา กรุณาลองใหม่'
  } else if (error.message === 'Network Error') {
    error.message = 'เครือข่ายมีปัญหา หรือเซิร์ฟเวอร์ไม่ตอบสนอง'
  }
  return error
}

// ---- Public instance (สำหรับ login/register ฯลฯ) ----
export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.request.use(
  (config) => {
    setJsonHeaders(config)
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => Promise.reject(normalizeAxiosError(error))
)

// ---- Protected instance (แนบ Bearer อัตโนมัติ) ----
export const authAxios: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
})

authAxios.interceptors.request.use(
  (config) => {
    setJsonHeaders(config)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        const headers = ensureAxiosHeaders(config)
        // อย่าทับถ้ามีการตั้ง Authorization เอง (กรณีพิเศษ)
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

authAxios.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status
    // 401: Unauthorized, 419: Laravel token expired
    if (status === 401 || status === 419) {
      try {
        localStorage.setItem(
          'auth_event',
          JSON.stringify({ type: 'LOGOUT', at: Date.now() })
        )
      } catch {}
    }
    return Promise.reject(normalizeAxiosError(error))
  }
)

// ---- Export helper สำหรับ AuthContext ----
export function setAuthHeader(token?: string) {
  if (token) {
    authAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    try {
      localStorage.setItem('token', token)
    } catch {}
  } else {
    delete authAxios.defaults.headers.common['Authorization']
    try {
      localStorage.removeItem('token')
    } catch {}
  }
}

// ---- ตั้งค่าเริ่มต้นจาก localStorage (กันรีเฟรชแล้ว header หาย) ----
try {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token')
    if (t) setAuthHeader(t)
  }
} catch {}
