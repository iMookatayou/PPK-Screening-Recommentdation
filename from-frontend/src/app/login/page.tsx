'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/axios';
import styles from './styles/Login.module.css';
import { User, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react';
import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '../components/ui/ToastProvider';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, login } = useAuth();

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

  // already logged in → ไปหน้าหลักงาน
  useEffect(() => {
    if (isAuthenticated && !finished) {
      router.replace('/erdsppk');
    }
  }, [isAuthenticated, finished, router]);

  // รับ error จาก query string
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (!shownToastRef.current && errorParam === 'unauthenticated') {
      addToast({
        type: 'error',
        message: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งานระบบ',
        position: 'top-right',
      });
      shownToastRef.current = true;
    }
  }, [searchParams, addToast]);

  const handleLogin = async () => {
    if (isLoggingIn.current || finished || loading) return;
    isLoggingIn.current = true;
    setError('');
    setLoading(true);

    // clean + validate
    const cleanCid = cid.replace(/\D/g, '');
    if (!cleanCid || !password || !/^\d{13}$/.test(cleanCid)) {
      setError('กรุณากรอกเลขบัตรประชาชน 13 หลัก และรหัสผ่านให้ครบถ้วน');
      isLoggingIn.current = false;
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/login-token', { cid: cleanCid, password });

      // รองรับทั้ง { token, user, expires_at } หรือ { access_token, ... }
      const token = res.data.token || res.data.access_token;
      const user = res.data.user;
      const expiresAt = res.data.expires_at;

      if (!token || !user) {
        throw new Error('รูปแบบข้อมูลตอบกลับไม่ถูกต้อง');
      }

      // ใช้ login จาก AuthContext เพื่อเซ็ต token/user + ตั้ง auto-logout
      login(token, user, expiresAt);

      setFinished(true);
      setTimeout(() => setFadeOut(true), 1600);
      setTimeout(() => router.push('/erdsppk'), 2000);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message;

      if (code === 'PENDING') {
        setError('บัญชีกำลังรออนุมัติจากผู้ดูแลระบบ');
        addToast({ type: 'info', message: 'โปรดรอผู้ดูแลระบบอนุมัติ', position: 'top-right' });
      } else if (code === 'REJECTED') {
        setError('บัญชีถูกปฏิเสธการอนุมัติ');
        addToast({ type: 'error', message: 'บัญชีถูกปฏิเสธการอนุมัติ', position: 'top-right' });
      } else {
        setError(msg || 'เข้าสู่ระบบล้มเหลว');
        addToast({ type: 'error', message: msg || 'เข้าสู่ระบบล้มเหลว', position: 'top-right' });
      }
    } finally {
      isLoggingIn.current = false;
      setLoading(false);
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
                      // เก็บเฉพาะตัวเลข + จำกัด 13 หลัก
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
    </div>
  );
}
