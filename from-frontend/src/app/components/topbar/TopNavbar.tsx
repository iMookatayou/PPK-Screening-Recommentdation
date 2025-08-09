'use client'

import { useAuth } from '@/app/context/AuthContext'
import styles from './TopNavbar.module.css'
import { LogOut, Menu, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TopNavBar() {
  const { user, logout, loading } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

  const displayName = useMemo(() => {
    if (!user) return ''
    // รองรับทั้งกรณี backend ส่ง name มา และกรณีมี first_name/last_name เท่านั้น
    const fromFL = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    return (user.name && user.name.trim()) || fromFL || user.email || 'ไม่พบชื่อ'
  }, [user])

  const avatarSrc = user?.avatar || '/ico/useravatar.ico'

  const goToAdminPage = () => router.push('/admin/user')

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <img src="/images/logoppk.png" alt="Logo" className={styles.logo} />
        <div className={styles.titleGroup}>
          <div className={styles.titleEn}>PHRAPOKKLAO HOSPITAL</div>
          <div className={styles.titleTh}>โรงพยาบาลพระปกเกล้าจันทบุรี</div>
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

        {/* ปุ่มแอดมิน */}
        {!loading && user?.role === 'admin' && (
          <button onClick={goToAdminPage} className={styles.adminBtn} title="หน้าแอดมิน">
            <ShieldCheck className={styles.adminIcon} />
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
