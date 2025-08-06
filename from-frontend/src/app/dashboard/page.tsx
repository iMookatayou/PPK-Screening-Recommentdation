'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bar } from 'react-chartjs-2'
import 'chart.js/auto'
import { RefreshCcw, ArrowLeftCircle, Clock, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { getTitle } from '@/app/components/utils/getTitle'
import styles from './styles/Dashboard.module.css'

type SummaryItem = {
  question_key: string
  clinic?: string | null
  total: number
}

export default function ReferralStatsDashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'referral' | 'formppk'>('all')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Missing token')

      const apiPath =
        filterType === 'all'
          ? '/referral-guidances/summary-all'
          : filterType === 'referral'
          ? '/referral-guidances/summary'
          : '/form-ppk/summary'

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${apiPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้')

      const data: SummaryItem[] = await res.json()

      const countMap: Record<string, number> = {}
      data.forEach((item) => {
        const match = item.question_key.match(/\d+/)
        let title = item.question_key
        if (match) {
          const id = parseInt(match[0])
          title = getTitle(id)
        }
        countMap[title] = item.total
      })

      setStats(countMap)
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [filterType])

  const labels = Object.keys(stats)
  const counts = Object.values(stats)

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>สถิติการแนะนำตามอาการ</h1>

          <div className={styles.actions}>
            <button onClick={fetchStats} className={styles.btnRefresh}>
              <RefreshCcw size={18} strokeWidth={1.5} />
              โหลดใหม่
            </button>
            <Link href="/erdsppk">
              <button className={styles.btnBack}>
                <ArrowLeftCircle size={18} strokeWidth={1.5} />
                กลับหน้าคัดกรอง
              </button>
            </Link>
          </div>
        </div>

        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <button
            onClick={() => setFilterType('all')}
            className={filterType === 'all' ? styles.btnSelected : styles.btnChoice}
          >
            รวมทั้งหมด
          </button>
          <button
            onClick={() => setFilterType('referral')}
            className={filterType === 'referral' ? styles.btnSelected : styles.btnChoice}
          >
            เฉพาะแนะนำ
          </button>
          <button
            onClick={() => setFilterType('formppk')}
            className={filterType === 'formppk' ? styles.btnSelected : styles.btnChoice}
          >
            เฉพาะเคสจริง
          </button>
        </div>

        {loading && (
          <div className={styles.statusBox}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              <Clock size={24} strokeWidth={1.5} />
            </motion.div>
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        )}

        {error && (
          <div className={styles.statusBoxError}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 12 }}
              style={{ display: 'inline-block' }}
            >
              <XCircle size={24} strokeWidth={1.5} color="red" />
            </motion.div>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && labels.length > 0 && (
          <>
            <div className={styles.chartWrapper}>
              <Bar
                data={{
                  labels,
                  datasets: [
                    {
                      label: 'จำนวนครั้ง',
                      data: counts,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  indexAxis: 'x',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#000' }, beginAtZero: true },
                    y: { ticks: { color: '#000' }, beginAtZero: true },
                  },
                }}
              />
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>อาการ</th>
                    <th>จำนวนครั้ง</th>
                  </tr>
                </thead>
                <tbody>
                  {labels.map((label, idx) => (
                    <tr key={idx}>
                      <td>{label}</td>
                      <td>{stats[label]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
