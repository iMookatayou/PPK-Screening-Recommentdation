'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import styles from './TopNavbar.module.css'
import { LogOut } from 'lucide-react'

export default function TopNavBar() {
  const { user, logout, loading } = useAuth()
  const [localUser, setLocalUser] = useState<any>(null)

  useEffect(() => {
    if (user) {
      setLocalUser(user)
    } else {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          setLocalUser(JSON.parse(storedUser))
        } catch {
          setLocalUser(null)
        }
      }
    }
  }, [user])

  if (loading) {
    return (
      <header className={styles.header}>
        <div className={styles.left}>
          <img src="/images/logoppk.png" alt="Logo" className={styles.logo} />
          <div className={styles.titleGroup}>
            <div className={styles.titleEn}>PHRAPOKKLAO HOSPITAL</div>
            <div className={styles.titleTh}>โรงพยาบาลพระปกเกล้าจันทบุรี</div>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.userBox}>กำลังโหลด...</div>
        </div>
      </header>
    )
  }

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
        {localUser ? (
          <div className={styles.userBox}>
            <img
              src={localUser.avatar || '/ico/useravatar.ico'}
              alt="User Avatar"
              className={styles.avatar}
            />
            <div className={styles.userInfo}>
              <div className={styles.name}>{localUser.name}</div>
            </div>
          </div>
        ) : (
          <div className={styles.userBox}>
            <div className={styles.userInfo}>ไม่พบข้อมูลผู้ใช้</div>
          </div>
        )}

        <button
          className={styles.logoutBtn}
          onClick={logout}
          title="ออกจากระบบ"
        >
          <LogOut className={styles.logoutIcon} />
        </button>
      </div>
    </header>
  )
}
