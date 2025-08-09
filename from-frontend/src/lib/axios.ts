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
  // แปลง plain object → AxiosHeaders แล้ว set กลับ
  const ah = AxiosHeaders.from(h)
  config.headers = ah
  return ah
}

function setJsonHeaders(config: InternalAxiosRequestConfig) {
  const headers = ensureAxiosHeaders(config)
  headers.set('Accept', 'application/json')
  headers.set('Content-Type', 'application/json')
}

// ---- Public instance (login/register ฯลฯ) ----
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
        headers.set('Authorization', `Bearer ${token}`)
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

authAxios.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        localStorage.setItem(
          'auth_event',
          JSON.stringify({ type: 'LOGOUT', at: Date.now() })
        )
      } catch {}
    }
    return Promise.reject(error)
  }
)
