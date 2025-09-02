'use client'

import { useAuth } from '@/app/context/AuthContext'
import styles from './TopNavbar.module.css'
import { LogOut, Menu, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAxios } from '@/lib/axios'

export default function TopNavBar() {
  const { user, logout, loading } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

  // ------ NEW: pending badge ------
  const [pending, setPending] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPending = async () => {
    try {
      // ขอเบา ๆ เอาแค่ meta.total
      const res = await authAxios.get('/admin/users', {
        params: { status: 'pending', per_page: 1, page: 1 },
      })
      const total = res?.data?.meta?.total ?? 0
      setPending(total)
    } catch {
      // เงียบไว้ไม่รบกวนผู้ใช้
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    let intervalId: number | null = null;
    let inFlight = false;
    const fetchSafe = async () => {
      if (inFlight) return;
      inFlight = true;
      try { await fetchPending(); } finally { inFlight = false; }
    };

    const start = () => {
      // เรียกครั้งแรกทันที
      fetchSafe();
      // เริ่ม interval เฉพาะตอนมองเห็นแท็บ
      intervalId = window.setInterval(fetchSafe, 60_000);
    };

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    };

    // initial
    if (document.visibilityState === 'visible') start();

    document.addEventListener('visibilitychange', onVisibility);
    const refreshHandler = () => fetchSafe();
    window.addEventListener('admin-pending-refresh', refreshHandler as EventListener);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('admin-pending-refresh', refreshHandler as EventListener);
    };
  }, [user]);

  // ------ /NEW ------

  const displayName = useMemo(() => {
    if (!user) return ''
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    return user.username || fullName || user.email || 'ไม่พบชื่อ'
  }, [user])

  const avatarSrc = user?.avatar || '/ico/useravatar.ico'
  const goToAdminPage = () => router.push('/admin/user')
  // cap 99+
  const pendingText = pending > 99 ? '99+' : String(pending)
  const adminAria =
    !loading && user?.role === 'admin'
      ? pending > 0
        ? `หน้าแอดมิน มีผู้รออนุมัติ ${pending} ราย`
        : 'หน้าแอดมิน'
      : undefined

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <img src="/images/logoppk.png" alt="Logo" className={styles.logo} />
        <div className={styles.titleGroup}>
          <div className={styles.titleEn}>PHRAPOKKLAO HOSPITAL</div>
          <div className={styles.titleTh}>PPK Pre-Service Health Screening System </div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.right}>
        {/* Hamburger (จอเล็ก) */}
        <div className={styles.hamburgerWrapper}>
          <button
            className={styles.hamburger}
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          {showMenu && (
            <div className={styles.dropdownMenu}>
              <div className={styles.userInfo}>{displayName}</div>
              <button onClick={logout} className={styles.dropdownLogout}>
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>

        {/* จอปกติ */}
        {!loading && user && (
          <div className={styles.userBox}>
            <img src={avatarSrc} alt="User Avatar" className={styles.avatar} />
            <div className={styles.name}>{displayName}</div>
          </div>
        )}

        {/* ปุ่มแอดมิน + badge */}
        {!loading && user?.role === 'admin' && (
          <button
            onClick={goToAdminPage}
            className={styles.adminBtn}
            title="หน้าแอดมิน"
            aria-label={adminAria}
          >
            <ShieldCheck className={styles.adminIcon} />
            {pending > 0 && <span className={styles.adminBadge}>{pendingText}</span>}
          </button>
        )}

        {!loading && user && (
          <button className={styles.logoutBtn} onClick={logout} title="ออกจากระบบ">
            <LogOut className={styles.logoutIcon} />
          </button>
        )}
      </div>
    </header>
  )
}
