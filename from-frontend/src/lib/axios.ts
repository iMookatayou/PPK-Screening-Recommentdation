// src/lib/axios.ts
import axios, {
  AxiosInstance,
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios'

/* ---------------- Base URL ----------------
   - ไม่ throw ตอน import-time (กัน build ล้ม)
   - ถ้าไม่ตั้ง NEXT_PUBLIC_API_BASE_URL → ใช้ '/api' เป็นค่า fallback
   - auto เติม '/api' ให้เมื่อยังไม่มี
------------------------------------------- */
function resolveBaseURL(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || '' // ไม่โยน error
  const candidate = raw.trim() === '' ? '/api' : raw.trim()
  const noTrail = candidate.replace(/\/+$/, '')
  return noTrail.endsWith('/api') ? noTrail : `${noTrail}/api`
}
const baseURL = resolveBaseURL()

/* --------------- Helpers --------------- */
function ensureAxiosHeaders(config: InternalAxiosRequestConfig): AxiosHeaders {
  const h = config.headers
  if (!h) {
    const ah = new AxiosHeaders()
    config.headers = ah
    return ah
  }
  if (h instanceof AxiosHeaders) return h
  const ah = AxiosHeaders.from(h)
  config.headers = ah
  return ah
}

function setJsonHeaders(config: InternalAxiosRequestConfig) {
  const headers = ensureAxiosHeaders(config)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const isForm =
    typeof FormData !== 'undefined' && config.data instanceof FormData

  if (!headers.has('Content-Type') && !isForm) {
    headers.set('Content-Type', 'application/json')
  }
}

function normalizeAxiosError(error: AxiosError) {
  if (error.code === 'ECONNABORTED') {
    error.message ||= 'คำขอหมดเวลา กรุณาลองใหม่'
  } else if (error.message === 'Network Error') {
    error.message = 'เครือข่ายมีปัญหา หรือเซิร์ฟเวอร์ไม่ตอบสนอง'
  }
  return error
}

/* -------- Public instance -------- */
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

/* -------- Protected instance (Bearer) -------- */
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

/* ---- Helper สำหรับ AuthContext ---- */
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

/* ---- ตั้งค่าเริ่มต้นจาก localStorage ---- */
try {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token')
    if (t) setAuthHeader(t)
  }
} catch {}
