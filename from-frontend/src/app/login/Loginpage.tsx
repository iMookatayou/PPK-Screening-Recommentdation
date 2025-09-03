// src/app/login/Loginpage.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { loginWithCidPassword, fetchMe } from '@/lib/axios';

import styles from './styles/Login.module.css';
import { User, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react';
import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '../components/ui/popup/ToastProvider';

import ReusablePopup from '@/app/components/ui/popup/ReusablePopup';
import {
  makeUserStatusPopupMapper,
  createDefaultPopupActionRunner,
  type ApiResponse,
} from '@/app/components/ui/popup/userStatusPopupMapper';

/* ===================== Debug Helpers ===================== */
const DEBUG =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG_AUTH === '1';

function maskCid(cid: string) {
  const d = cid.replace(/\D/g, '');
  if (d.length <= 4) return '*'.repeat(d.length);
  return d.slice(0, 3) + '******' + d.slice(-4);
}

function nowISO() {
  return new Date().toISOString();
}

/** log แบบกลุ่ม และบังคับแสดงเฉพาะตอน DEBUG */
function logGroup(title: string, fn: () => void, collapsed = true) {
  if (!DEBUG) return;
  const start = performance.now();
  const group = collapsed ? console.groupCollapsed : console.group;
  group(`%c[Login] ${title}`, 'color:#2563eb;font-weight:600;');
  try {
    fn();
  } finally {
    const ms = (performance.now() - start).toFixed(1);
    console.log('%c[Login] elapsed:', 'color:#64748b;', `${ms} ms`);
    console.groupEnd();
  }
}

/* ========================================================= */

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, login, logout } = useAuth();

  const [cid, setCid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const { addToast } = useToast();
  const shownToastRef = useRef(false);
  const isLoggingIn = useRef(false);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupProps, setPopupProps] = useState<any>(null);

  const runAction = createDefaultPopupActionRunner(
    (url) => router.push(url),
    logout
  );
  const mapToPopup = makeUserStatusPopupMapper(runAction);

  // already logged in → ไปหน้าหลักงาน
  useEffect(() => {
    if (isAuthenticated && !finished) {
      logGroup('Already authenticated → redirect to /erdsppk', () => {
        console.info('time:', nowISO(), {
          isAuthenticated,
          finished,
        });
      });
      router.replace('/erdsppk');
    }
  }, [isAuthenticated, finished, router]);

  // รับ error จาก query string
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (!shownToastRef.current && errorParam === 'unauthenticated') {
      logGroup('Query error=unauthenticated', () => {
        console.warn('time:', nowISO(), 'query.error:', errorParam);
      });
      addToast({
        type: 'error',
        message: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งานระบบ',
        position: 'top-right',
      });
      shownToastRef.current = true;
    }
  }, [searchParams, addToast]);

  const handleLogin = async () => {
    if (isLoggingIn.current || finished || loading) {
      logGroup('Blocked duplicate login attempt', () => {
        console.warn('time:', nowISO(), {
          isLoggingIn: isLoggingIn.current,
          finished,
          loading,
        });
      });
      return;
    }

    isLoggingIn.current = true;
    setError('');
    setLoading(true);

    const cleanCid = cid.replace(/\D/g, '');

    logGroup('Pre-validate input', () => {
      console.debug('cid:', maskCid(cleanCid), 'cid_len:', cleanCid.length);
      console.debug('password_present:', password.length > 0 ? 'yes' : 'no');
    });

    if (!cleanCid || !password || !/^\d{13}$/.test(cleanCid)) {
      setError('กรุณากรอกเลขบัตรประชาชน 13 หลัก และรหัสผ่านให้ครบถ้วน');
      isLoggingIn.current = false;
      setLoading(false);
      logGroup('Validation failed', () => {
        console.error('time:', nowISO(), 'reason:', 'invalid cid/password');
      });
      return;
    }

    const perfMark = `login-${Date.now()}`;
    performance.mark(perfMark);

    try {
      logGroup('POST /login (Sanctum) → request', () => {
        console.info('time:', nowISO(), 'payload:', {
          cid: maskCid(cleanCid),
          password: '***hidden***',
        });
      });

      // 1) CSRF + Login (ยิงที่ ROOT /login → ทำใน axios.ts)
      await loginWithCidPassword(cleanCid, password);

      // 2) ดึงข้อมูลผู้ใช้จาก session
      const meRes = await fetchMe();
      const me = meRes?.data ?? meRes;

      const measure = `login-measure-${Date.now()}`;
      performance.measure(measure, perfMark);

      // 3) อัปเดต AuthContext เดิม (คง signature เดิมไว้ → ส่ง null ให้ token/expiry)
      login(null as any, me, null as any);

      const [entry] = performance.getEntriesByName(measure);
      logGroup('AuthContext session login success', () => {
        console.info(
          'time:',
          nowISO(),
          'redirect:/erdsppk',
          'latency(ms):',
          (entry as any)?.duration?.toFixed?.(1)
        );
        console.debug('user.id:', me?.id, 'user.name:', me?.first_name ?? me?.name);
      });

      setFinished(true);
      setTimeout(() => setFadeOut(true), 1600);
      setTimeout(() => router.push('/erdsppk'), 2000);
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      const code = err?.response?.data?.code as string | undefined;
      const msg = err?.response?.data?.message as string | undefined;

      logGroup('Login error caught', () => {
        console.error('time:', nowISO(), 'httpStatus:', httpStatus, 'code:', code);
        if (DEBUG) {
          try {
            const safe = JSON.parse(
              JSON.stringify(err, Object.getOwnPropertyNames(err))
            );
            console.dir(safe);
          } catch {
            console.warn('Failed to serialize error for debug');
          }
        }
      });

      // เคสพบบ่อย
      if (httpStatus === 419) {
        const txt = 'เซสชันหมดอายุหรือ CSRF ไม่ตรง (โปรดลองอีกครั้ง)';
        setError(txt);
        addToast({ type: 'error', message: txt, position: 'top-right' });
        setLoading(false);
        isLoggingIn.current = false;
        return;
      }
      if (httpStatus === 401) {
        const txt = msg || 'CID หรือรหัสผ่านไม่ถูกต้อง';
        setError(txt);
        addToast({ type: 'error', message: txt, position: 'top-right' });
        setLoading(false);
        isLoggingIn.current = false;
        return;
      }
      if (httpStatus === 500) {
        const txt = 'เซิร์ฟเวอร์ผิดพลาด (500) — โปรดตรวจสอบฐานข้อมูล/การตั้งค่า';
        setError(txt);
        addToast({ type: 'error', message: txt, position: 'top-right' });
        setLoading(false);
        isLoggingIn.current = false;
        return;
      }

      if (httpStatus === 422 && err?.response?.data?.errors) {
        const errors = err.response.data.errors as Record<string, string[]>;
        const firstMsg = Object.values(errors)[0]?.[0];
        setError(firstMsg || 'ข้อมูลไม่ถูกต้อง');

        logGroup('Handled 422 validation', () => {
          console.warn('firstError:', firstMsg);
          console.debug('fields:', Object.keys(errors));
        });

        setLoading(false);
        isLoggingIn.current = false;
        return;
      }

      if (httpStatus === 429 && code === 'RATE_LIMIT') {
        const retry = (err?.response?.data as any)?.retry_after;
        const txt = retry
          ? `พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ใน ${retry} วินาที`
          : msg || 'ลองใหม่ภายหลัง';
        setError(txt);
        addToast({ type: 'warning', message: txt, position: 'top-right' });

        logGroup('Handled 429 rate limit', () => {
          console.warn('retry_after(sec):', retry);
        });

        setLoading(false);
        isLoggingIn.current = false;
        return;
      }

      if (code === 'PENDING') {
        setError('บัญชีกำลังรออนุมัติจากผู้ดูแลระบบ');
        addToast({
          type: 'info',
          message: 'โปรดรอผู้ดูแลระบบอนุมัติ',
          position: 'top-right',
        });

        logGroup('Handled status:PENDING', () => {
          console.info('account status:', code);
        });
      } else if (code === 'REJECTED') {
        setError('บัญชีถูกปฏิเสธการอนุมัติ');
        addToast({
          type: 'error',
          message: 'บัญชีถูกปฏิเสธการอนุมัติ',
          position: 'top-right',
        });

        logGroup('Handled status:REJECTED', () => {
          console.info('account status:', code);
        });
      } else if (code && err?.response?.data?.message) {
        const apiPayload = err.response.data as ApiResponse;
        const mapped = mapToPopup(apiPayload);
        setPopupProps(mapped);
        setPopupOpen(true);

        logGroup('Handled known api code → popup', () => {
          console.info('code:', code, 'message:', apiPayload?.message);
        });
      } else {
        const fallback = msg || 'เข้าสู่ระบบล้มเหลว';
        setError(fallback);
        addToast({ type: 'error', message: fallback, position: 'top-right' });

        logGroup('Fallback error handler', () => {
          console.error('fallback:', fallback);
        });
      }
    } finally {
      isLoggingIn.current = false;
      setLoading(false);

      logGroup('Login finally', () => {
        console.debug('loading:', loading, 'finished:', finished, 'popupOpen:', popupOpen);
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  if (isAuthenticated && !finished) return null;

  return (
    <div className={styles.loginBackground}>
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <div className={styles.left}>
            {/* Loading Animation */}
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
                  <p className={styles.loadingText}>กำลังเข้าสู่ระบบ...</p>
                </div>
              </>
            )}

            {/* Login Form */}
            {!loading && !finished && (
              <>
                <AnimatedLogo />
                <div className={styles.loginHeader}>
                  <h2>LOGIN TO P P K</h2>
                </div>

                <div className={styles.inputGroup}>
                  <User className={styles.icon} size={18} />
                  <motion.input
                    type="text"
                    placeholder="เลขบัตรประชาชน (CID)"
                    value={cid}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
                      setCid(digits);
                    }}
                    onKeyDown={handleKeyPress}
                    whileFocus={{ scale: 1.03, y: -2 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className={styles.animatedInput}
                    inputMode="numeric"
                    maxLength={13}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <KeyRound className={styles.icon} size={18} />
                  <motion.input
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

                <button onClick={handleLogin} className={styles.loginButton} disabled={loading}>
                  เข้าสู่ระบบ
                </button>

                {/* ลิงก์ไปสมัครสมาชิก */}
                <div className={styles.registerLinkWrapper}>
                  <span>ยังไม่มีบัญชี?</span>
                  <Link href="/register" className={styles.registerLink}>
                    สมัครสมาชิก
                  </Link>
                </div>

                {error && <p className={styles.error}>{error}</p>}
              </>
            )}

            {/* Success Message */}
            {finished && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: fadeOut ? 0 : 1 }}
                transition={{ duration: 0.4 }}
                style={{
                  marginTop: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <motion.div
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
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

      {/* Popup ตรงนี้ */}
      {popupProps && (
        <ReusablePopup open={popupOpen} onClose={() => setPopupOpen(false)} {...popupProps} />
      )}
    </div>
  );
}
