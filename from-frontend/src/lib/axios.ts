// src/lib/axios.ts
'use client';

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';

/* -------------------------------------------------------------------------- */
/*                             Base URL & Constants                           */
/* -------------------------------------------------------------------------- */

/** ใช้ ENV เท่านั้น และ "ต้องลงท้าย /api เสมอ" */
function resolveApiBaseURL(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();
  if (!raw) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined in environment (.env of frontend).');
  }
  // กันเคสผู้ใช้ใส่ /api ซ้ำ
  const root = raw.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${root}/api`;
}

const baseURL = resolveApiBaseURL();            // e.g. http://10.10.54.185:4002/api
const rootURL = baseURL.replace(/\/api$/i, ''); // e.g. http://10.10.54.185:4002

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

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
  // ถ้าต้องการภาษาหลักเป็นไทย เปิดบรรทัดล่างนี้:
  // if (!headers.has('Accept-Language')) headers.set('Accept-Language', 'th-TH');

  const method = (config.method || 'get').toLowerCase();
  const safeNoBody =
    (method === 'get' || method === 'head' || method === 'delete') && !config.data;

  const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;

  if (!headers.has('Content-Type') && !isForm && !safeNoBody) {
    headers.set('Content-Type', 'application/json');
  }

  // สำคัญกับบาง proxy / CSRF policy
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }
}

/** Error helper: DB ยังไม่พร้อม */
export function isDbNotReady(err: unknown): boolean {
  const e = err as any;
  return (
    e?.response?.status === 503 &&
    (e?.response?.data?.error_code === 'DB_NOT_READY' ||
      /database not ready/i.test(String(e?.response?.data?.message ?? '')) ||
      /ฐานข้อมูลยังไม่พร้อม/i.test(String(e?.response?.data?.message ?? '')))
  );
}

/** ปรับข้อความ error จาก axios ให้เป็นมิตรขึ้น */
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

/** เพิ่ม no_cache=1 ให้ URL (กัน cache ระหว่างดีบัก) — แก้เคส '?' ซ้ำ */
export function withNoCache(url: string): string {
  try {
    const u = new URL(url, 'http://x/');
    u.searchParams.set('no_cache', '1');
    const query = u.search || ''; // <-- เดิมคำนวณใหม่ทำให้ '?' ซ้ำ
    const path = u.pathname + query;
    return path.charAt(0) === '/' ? path : '/' + path;
  } catch {
    return url.includes('?') ? url + '&no_cache=1' : url + '?no_cache=1';
  }
}

/** ทำ path ให้เป็น relative ต่อ /api เสมอ */
function toApiRelativePath(url: string | undefined): string | undefined {
  if (!url) return url;
  let path: string;
  try {
    const u = new URL(url, 'http://x/');
    path = u.pathname + (u.search || '');
  } catch {
    path = url.startsWith('/') ? url : `/${url}`;
  }
  // baseURL ลงท้าย /api แล้ว → ลอก /api ออกถ้าเผลอใส่มา
  path = path.replace(/^\/api(\/|$)/i, '/');
  return path;
}

/** อ่านค่า cookie ฝั่ง browser */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return m ? decodeURIComponent(m[1]) : null;
}

/* -------------------------------------------------------------------------- */
/*                                Axios Instance                              */
/* -------------------------------------------------------------------------- */

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,                 // ส่ง/รับคุกกี้ (Sanctum SPA)
  xsrfCookieName: 'XSRF-TOKEN',          // Laravel Sanctum default
  xsrfHeaderName: 'X-XSRF-TOKEN',        // Laravel Sanctum default
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

/* ---- Interceptors ---- */
api.interceptors.request.use(
  (config) => {
    setJsonHeaders(config);
    // อนุญาตให้ข้ามการปรับ URL ถ้าตั้ง __absolute__ ไว้
    if (typeof config.url === 'string' && !(config as any).__absolute__) {
      config.url = toApiRelativePath(config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Auto-refresh CSRF:
 * - ถ้าเจอ 419 ในคำขอที่ไม่ใช่ GET และยังไม่เคย retry → ensureCsrfCookie() แล้วลองยิงซ้ำ 1 ครั้ง
 * - หมายเหตุ: เปิด 401 retry ได้ แต่ไม่ “จำเป็น” ถ้าคุณอยากให้ 401 เด้งไป login เลย
 */
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { __retried419?: boolean }) | undefined;

    if (
      error.response?.status === 419 &&
      cfg &&
      (cfg.method || 'get').toLowerCase() !== 'get' &&
      !cfg.__retried419
    ) {
      try {
        await ensureCsrfCookie();
        cfg.__retried419 = true;
        return api.request(cfg);
      } catch {
        // ปล่อยไป normalize ด้านล่าง
      }
    }

    if (isDbNotReady(error)) {
      (error as any).userMessage = 'ระบบยังไม่พร้อมใช้งาน (ฐานข้อมูลยังไม่ถูกตั้งค่า)';
    }
    return Promise.reject(normalizeAxiosError(error));
  }
);

/* -------------------------------------------------------------------------- */
/*                          Root Request Helper (non-/api)                    */
/* -------------------------------------------------------------------------- */

/** ยิงคำขอไป ROOT (เช่น /login, /logout) โดยไม่ให้ interceptor แปลง URL */
function requestRoot<T = any>(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  data?: any
) {
  return api.request<T>({
    method,
    url: `${rootURL}${path}`,
    data,
    withCredentials: true,
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    // @ts-expect-error: custom flag to skip toApiRelativePath
    __absolute__: true,
  });
}

/* -------------------------------------------------------------------------- */
/*                               Sanctum Helpers                              */
/* -------------------------------------------------------------------------- */

/**
 * 1) เรียก CSRF ที่ ROOT (ไม่ใช่ /api)
 * 2) อ่านคุกกี้ XSRF-TOKEN เอง แล้ว "ยัด" เป็น header default ให้ instance
 */
export async function ensureCsrfCookie() {
  await axios.get(`${rootURL}/sanctum/csrf-cookie`, {
    withCredentials: true,
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    params: { t: Date.now() }, // กัน cache
  });

  const token = getCookie('XSRF-TOKEN');
  if (token) {
    api.defaults.headers.common['X-XSRF-TOKEN'] = token;
  }
}

/**
 * เรียกตอนแอปบูต (กัน 419 ครั้งแรก)
 * ใช้ใน layout/_app: useEffect(() => { bootstrapAuth(); }, []);
 */
export async function bootstrapAuth() {
  try { await ensureCsrfCookie(); } catch { /* ignore */ }
}

/** ล็อกอินด้วย CID/Password (Cookie Session) → ยิงที่ ROOT
 * - ถ้าแบ็กเอนด์คุณใช้ Fortify/Jetstream (session) ปกติ route คือ '/login'
 * - ถ้าคุณทำ '/api/login' เองที่ออก session cookie → เปลี่ยน path ให้ตรงระบบคุณ
 */
export async function loginWithCidPassword(cid: string, password: string) {
  await ensureCsrfCookie();
  // Fortify/Jetstream: '/login'
  // Custom API session login: '/api/login'
  const res = await requestRoot('post', '/api/login', { cid, password });
  return res.data;
}

/** ออกจากระบบ (Cookie Session) → ยิงที่ ROOT
 * - Fortify/Jetstream มาตรฐาน: '/logout'
 * - ถ้าใช้ '/api/logout' ในระบบคุณ ให้เปลี่ยน path ด้านล่าง
 */
export async function logoutSession() {
  await ensureCsrfCookie();
  const res = await requestRoot('post', '/api/logout');
  return res.data;
}

/** ดึงข้อมูลผู้ใช้ปัจจุบัน (session-based) → /api/me */
export async function fetchMe() {
  const res = await api.get('/me');
  return res.data;
}

/** อัปเดตข้อมูลผู้ใช้ (ต้องมี CSRF) → /api/user */
export async function updateMe(payload: any) {
  await ensureCsrfCookie();
  const res = await api.put('/user', payload);
  return res.data;
}

/* -------------------------------------------------------------------------- */
/*                          Backward-compat / Named Exports                   */
/* -------------------------------------------------------------------------- */

export const authAxios: AxiosInstance = api;

// โหมด Cookie/Session (Sanctum SPA) จงใจ "ไม่ใช้" Bearer token
export function getToken(): string | null { return null; }
export function persistToken(_token: string) {}
export function dropToken() {}
export function setAuthHeader(_token?: string | null) {}
export function clearAuthHeader() {}
