'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import LoadingSpinner from '@/app/components/ui/LoadingSpinner'
import styles from './styles/SpecialDisease.module.css'

interface Disease {
  id: number
  name_th: string
  name_en?: string
  icd_10?: string
  category: '2 ชั่วโมง' | '24 ชั่วโมง' | '48 ชั่วโมง'
  alert: boolean
}

export default function SpecialDiseaseSurveillancePage() {
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAlertPopup, setShowAlertPopup] = useState(false)

  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/diseases`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}` || '',
          },
        })
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('API response is not an array')
        setDiseases(data)
      } catch (error) {
        console.error('Failed to fetch diseases:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDiseases()
  }, [])

  const filtered = searchTerm.trim()
    ? diseases.filter((d) => {
        const term = searchTerm.trim().toLowerCase()
        return (
          d.name_th.toLowerCase().includes(term) ||
          d.name_en?.toLowerCase().includes(term) ||
          d.icd_10?.toLowerCase().includes(term) ||
          (term.includes('2') && d.category === '2 ชั่วโมง') ||
          (term.includes('24') && d.category === '24 ชั่วโมง') ||
          (term.includes('48') && d.category === '48 ชั่วโมง')
        )
      })
    : diseases

  const categorized = {
    '2 ชั่วโมง': filtered.filter((d) => d.category === '2 ชั่วโมง'),
    '24 ชั่วโมง': filtered.filter((d) => d.category === '24 ชั่วโมง'),
    '48 ชั่วโมง': filtered.filter((d) => d.category === '48 ชั่วโมง'),
  }

  useEffect(() => {
    if (searchTerm && categorized['2 ชั่วโมง'].length > 0) {
      setShowAlertPopup(true)
    } else {
      setShowAlertPopup(false)
    }
  }, [searchTerm, categorized])

  return (
    <div className={styles.pageBackground}>
      <div className={styles.card}>
        <h1 className={styles.title}>ระบบเฝ้าระวังโรคติดต่อพิเศษ</h1>

        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาโรค ชื่อ ICD หรือเวลา เช่น '2 ชั่วโมง'"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <LoadingSpinner message="กำลังโหลดข้อมูล..." />
        ) : (
          <>
            {showAlertPopup && (
              <motion.div
                className={styles.popup}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertTriangle size={20} className={styles.alertIcon} />
                <span>พบโรคที่ต้องแจ้งภายใน 2 ชั่วโมง!</span>
              </motion.div>
            )}

            {(['2 ชั่วโมง', '24 ชั่วโมง', '48 ชั่วโมง'] as const).map((cat) => (
              <div key={cat} className={styles.categorySection}>
                <h2 className={styles.categoryTitle}>หมวด: {cat}</h2>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ชื่อโรค (TH)</th>
                        <th>ชื่อโรค (EN)</th>
                        <th>ICD-10</th>
                        <th>แจ้งเตือน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorized[cat].length > 0 ? (
                        categorized[cat].map((d) => (
                          <tr key={d.id}>
                            <td>{d.name_th}</td>
                            <td>{d.name_en ?? '-'}</td>
                            <td>{d.icd_10 ?? '-'}</td>
                            <td>
                              {d.category === '2 ชั่วโมง' ? (
                                <span className={styles.alertRed}>แจ้งภายใน 2 ชม.</span>
                              ) : (
                                `ภายใน ${d.category}`
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className={styles.noData}>
                            ไม่มีข้อมูล
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
