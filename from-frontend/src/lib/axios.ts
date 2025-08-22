// src/lib/axios.ts
'use client';

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';

/* ---------------- Base URL ---------------- */
// แนวคิด: ให้ตั้ง NEXT_PUBLIC_API_BASE_URL เป็น "รากของ API"
// จะเป็น http://IP:9001 หรือ http://IP:9001/api ก็ได้ โค้ดนี้จะกัน /api ซ้ำให้
function resolveBaseURL(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();
  if (!raw) {
    // ดีฟอลต์ให้เข้าถึง backend ตรงๆ ที่ :9001/api (แก้ให้ตรงสภาพแวดล้อมคุณได้)
    return 'http://127.0.0.1:4002/api';
  }
  // ตัด slash ท้าย
  const noTrail = raw.replace(/\/+$/, '');
  return noTrail;
}
const baseURL = resolveBaseURL();

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

  const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (!headers.has('Content-Type') && !isForm) {
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
    error.message = serverMsg;
  } else if (error.code === 'ECONNABORTED') {
    error.message ||= 'คำขอหมดเวลา กรุณาลองใหม่';
  } else if (error.message === 'Network Error') {
    error.message = 'เครือข่ายมีปัญหา หรือเซิร์ฟเวอร์ไม่ตอบสนอง';
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

/* ===== Utilities: ทำ path ให้ปลอดภัยเรื่อง /api ซ้ำ ===== */
function extractBaseApiPath(burl: string): string {
  try {
    const u = new URL(burl);
    return u.pathname.replace(/\/+$/, ''); // เช่น '' | '/' | '/api'
  } catch {
    // baseURL อาจเป็น relative (ไม่ควร แต่กันไว้)
    return '';
  }
}

/**
 * ให้ผลลัพธ์เป็น path ที่ "relative ต่อราก API"
 * - ตัด /api ออก 1 ชั้น ถ้า url เริ่มด้วย /api
 * - ถ้า baseURL เองลงท้ายด้วย /api และ url ก็เริ่มด้วย /api → จะตัดซ้ำชนกันออก
 */
function normalizeToApiRelativePath(url: string): string {
  // แปลงเป็น path (รองรับทั้ง absolute และ relative)
  let path: string;
  try {
    const u = new URL(url, 'http://x/');
    path = u.pathname;
  } catch {
    path = url.startsWith('/') ? url : `/${url}`;
  }
  // ให้เหลือ slash เดียวหน้า
  path = '/' + path.replace(/^\/+/, '');

  // basePath เช่น '' | '/' | '/api'
  const basePath = extractBaseApiPath(baseURL) || '';
  const baseIsApi = basePath === '/api';

  // ตัด /api ออกจาก path ถ้าซ้ำกับ base
  // กรณีทั่วไป: baseURL ลงท้าย /api แล้ว config.url ก็เขียน /api/... → เอา /api ของ url ออก
  if (baseIsApi && path.startsWith('/api/')) {
    return path.replace(/^\/api\//, '/');
  }
  // ถ้า base ไม่ใช่ /api แต่ url เขียน /api/... → ถือว่าอยากเข้าราก /api → คงไว้
  return path;
}

/* -------- Public instance -------- */
export const api: AxiosInstance = axios.create({
  baseURL, // อาจจะจบที่ ...:9001 หรือ ...:9001/api ก็ได้
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    setJsonHeaders(config);
    // กัน /api ซ้ำสำหรับทุกคำขอ
    if (typeof config.url === 'string') {
      const normalized = normalizeToApiRelativePath(config.url);
      config.url = normalized;
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
  baseURL,
  timeout: 15000,
});

/** สร้างรายการ endpoint แบบ “API-relative” (ไม่ใส่ /api นำหน้า) */
const PROTECTED_CORE_PATHS = [
  '/me',
  '/patient-cases',
  '/question-results',
  '/referral-guidances',
];
const EXCEPT_CORE_PATHS = ['/up', '/health', '/login-token'];

function isProtectedUrl(url: string | undefined): boolean {
  if (!url) return false;
  // แปลงเป็น path relative ต่อราก API
  const p = normalizeToApiRelativePath(url); // เช่น '/me' แทนที่จะเป็น '/api/me'
  if (EXCEPT_CORE_PATHS.some((x) => p.startsWith(x))) return false;
  return PROTECTED_CORE_PATHS.some((x) => p.startsWith(x));
}

authAxios.interceptors.request.use(
  (config) => {
    setJsonHeaders(config);

    // กัน /api ซ้ำ
    if (typeof config.url === 'string') {
      const normalized = normalizeToApiRelativePath(config.url);
      config.url = normalized;
    }

    const headers = ensureAxiosHeaders(config);

    (config as any).__shouldAuth = isProtectedUrl(config.url);

    if (typeof window !== 'undefined') {
      const token = getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        (config as any).__hadAuth = true;
      } else {
        (config as any).__hadAuth = false;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** กันเคลียร์ token มั่ว ๆ: เคลียร์เฉพาะกรณีที่ “ควรจะส่ง token + เราส่งไปแล้วจริง ๆ” */
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
        localStorage.setItem(
          'auth_event',
          JSON.stringify({ type: 'LOGOUT', at: Date.now() })
        );
      } catch {}
      setTimeout(() => {
        loggingOut = false;
      }, 1000);
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
    try {
      persistToken(token);
    } catch {}
  }
}

export function clearAuthHeader() {
  delete authAxios.defaults.headers.common['Authorization'];
  try {
    dropToken();
  } catch {}
}

/* ---- ตั้งค่าเริ่มต้นจาก localStorage ---- */
try {
  if (typeof window !== 'undefined') {
    const t = getToken();
    if (t) setAuthHeader(t);
  }
} catch {}
