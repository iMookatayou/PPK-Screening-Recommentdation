'use client';

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';

/* ---------------- Base URL: ใช้ ENV เท่านั้น และลงท้าย /api เสมอ ---------------- */
function resolveApiBaseURL(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();

  // ❌ ไม่ fallback ไป /api อีกแล้ว
  if (!raw) {
    // โยน error ทันทีเพื่อให้รู้ว่า env ไม่ถูกฝังตอน build
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined in environment (.env of frontend).');
  }

  // ตัดสแลชท้าย และตัด /api หนึ่งชั้นออกก่อน แล้วค่อยเติมกลับทีหลัง (กันซ้ำ)
  const root = raw.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${root}/api`;
}

const baseURL = resolveApiBaseURL();

/* --------------- Helpers --------------- */
function ensureAxiosHeaders(config: InternalAxiosRequestConfig): AxiosHeaders {
  const h = config.headers;
  if (!h) {
    const ah = new AxiosHeaders();
    config.headers = ah;
    return ah;
  }
  if (h instanceof AxiosHeaders) return h;
  const ah = AxiosHeaders.from(h);
  config.headers = ah;
  return ah;
}

function setJsonHeaders(config: InternalAxiosRequestConfig) {
  const headers = ensureAxiosHeaders(config);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const method = (config.method || 'get').toLowerCase();
  const safeNoBody =
    (method === 'get' || method === 'head' || method === 'delete') && !config.data;

  const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;

  if (!headers.has('Content-Type') && !isForm && !safeNoBody) {
    headers.set('Content-Type', 'application/json');
  }
}

/** DB not ready helper */
export function isDbNotReady(err: unknown): boolean {
  const e = err as any;
  return (
    e?.response?.status === 503 &&
    (e?.response?.data?.error_code === 'DB_NOT_READY' ||
      /database not ready/i.test(String(e?.response?.data?.message ?? '')) ||
      /ฐานข้อมูลยังไม่พร้อม/i.test(String(e?.response?.data?.message ?? '')))
  );
}

/** Normalize axios error message */
function normalizeAxiosError(error: AxiosError) {
  const server = (error.response?.data ?? {}) as any;
  const serverMsg = server?.message;
  const code = server?.error_code;

  if (serverMsg && typeof serverMsg === 'string') {
    (error as any).message = serverMsg;
  } else if (error.code === 'ECONNABORTED') {
    (error as any).message ||= 'คำขอหมดเวลา กรุณาลองใหม่';
  } else if (error.message === 'Network Error') {
    (error as any).message = 'เครือข่ายมีปัญหา หรือเซิร์ฟเวอร์ไม่ตอบสนอง';
  }

  (error as any).error_code = code ?? (error as any).error_code;
  return error;
}

/** Add ?no_cache=1 */
export function withNoCache(url: string): string {
  try {
    const u = new URL(url, 'http://x/');
    u.searchParams.set('no_cache', '1');
    const query = u.search ? '?' + u.searchParams.toString() : '';
    const path = u.pathname + query;
    return path.charAt(0) === '/' ? path : '/' + path;
  } catch {
    return url.includes('?') ? url + '&no_cache=1' : url + '?no_cache=1';
  }
}

/* ===== Utilities: ทำ path ให้เป็น “API-relative” เสมอ ===== */
function toApiRelativePath(url: string | undefined): string | undefined {
  if (!url) return url;
  let path: string;
  try {
    const u = new URL(url, 'http://x/');
    path = u.pathname + (u.search || '');
  } catch {
    path = url.startsWith('/') ? url : `/${url}`;
  }
  // baseURL ลงท้าย /api อยู่แล้ว → ลอก /api ออกถ้าเผลอใส่มา
  path = path.replace(/^\/api(\/|$)/i, '/');
  return path;
}

/* -------- Public instance -------- */
export const api: AxiosInstance = axios.create({
  baseURL, // จบที่ ...:4002/api เสมอ (มาจาก ENV เท่านั้น)
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    setJsonHeaders(config);
    if (typeof config.url === 'string') {
      config.url = toApiRelativePath(config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (isDbNotReady(error)) {
      (error as any).userMessage = 'ระบบยังไม่พร้อมใช้งาน (ฐานข้อมูลยังไม่ถูกตั้งค่า)';
    }
    return Promise.reject(normalizeAxiosError(error));
  }
);

/* ====== Auth utils (เก็บ token) ====== */
const TOKEN_KEYS = ['auth_token', 'token'];

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

export function persistToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

export function dropToken() {
  if (typeof window === 'undefined') return;
  for (const k of TOKEN_KEYS) localStorage.removeItem(k);
}

/* -------- Protected instance (Bearer) -------- */
export const authAxios: AxiosInstance = axios.create({
  baseURL, // ...:4002/api
  timeout: 15000,
});

const EXCEPT_AUTH_PATHS = ['/up', '/health', '/login-token'];

authAxios.interceptors.request.use(
  (config) => {
    setJsonHeaders(config);

    if (typeof config.url === 'string') {
      const p = toApiRelativePath(config.url) || '/';
      config.url = p;

      const needsAuth = !EXCEPT_AUTH_PATHS.some((x) => p.startsWith(x));
      (config as any).__shouldAuth = needsAuth;

      if (needsAuth && typeof window !== 'undefined') {
        const token = getToken();
        if (token) {
          ensureAxiosHeaders(config).set('Authorization', `Bearer ${token}`);
          (config as any).__hadAuth = true;
        } else {
          (config as any).__hadAuth = false;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** กันเคลียร์ token มั่ว ๆ */
let loggingOut = false;

authAxios.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    const cfg = error.config as any;
    const shouldLogout =
      (status === 401 || status === 419) &&
      cfg?.__shouldAuth === true &&
      cfg?.__hadAuth === true;

    if (shouldLogout && !loggingOut && typeof window !== 'undefined') {
      loggingOut = true;
      try {
        localStorage.setItem('auth_event', JSON.stringify({ type: 'LOGOUT', at: Date.now() }));
      } catch {}
      setTimeout(() => { loggingOut = false; }, 1000);
    }

    if (isDbNotReady(error)) {
      (error as any).userMessage = 'ระบบยังไม่พร้อมใช้งาน (ฐานข้อมูลยังไม่ถูกตั้งค่า)';
    }
    return Promise.reject(normalizeAxiosError(error));
  }
);

/* ---- Helper สำหรับ AuthContext ---- */
export function setAuthHeader(token?: string | null) {
  if (typeof token === 'string' && token.length > 0) {
    authAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try { persistToken(token); } catch {}
  }
}

export function clearAuthHeader() {
  delete authAxios.defaults.headers.common['Authorization'];
  try { dropToken(); } catch {}
}

/* ---- ตั้งค่าเริ่มต้นจาก localStorage ---- */
try {
  if (typeof window !== 'undefined') {
    const t = getToken();
    if (t) setAuthHeader(t);
  }
} catch {}
