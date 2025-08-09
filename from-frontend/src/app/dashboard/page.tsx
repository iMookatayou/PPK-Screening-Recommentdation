'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bar } from 'react-chartjs-2'
import 'chart.js/auto'
import { RefreshCcw, ArrowLeftCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { getTitle } from '@/app/components/utils/getTitle'
import styles from './styles/Dashboard.module.css'
import LoadingSpinner from '@/app/components/ui/LoadingSpinner'

type SummaryItem = {
  question_key?: string
  question?: string
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

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      }

      const fetchSummary = async (path: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, { headers })
        if (!res.ok) throw new Error(`API "${path}" โหลดข้อมูลไม่สำเร็จ`)
        const json = await res.json()

        if (!Array.isArray(json.data)) {
          console.error('Invalid API response:', json)
          throw new Error(`API "${path}" ส่งข้อมูลผิดรูปแบบ`)
        }

        return json.data as SummaryItem[]
      }

      let countMap: Record<string, number> = {}

      if (filterType === 'all') {
        const [referral, formppk] = await Promise.all([
          fetchSummary('/api/referral-guidances/summary'),
          fetchSummary('/api/form-ppk/summary'),
        ])

        for (const item of [...referral, ...formppk]) {
          const rawKey = item.question_key ?? item.question ?? 'ไม่ทราบอาการ'
          const match = rawKey.match(/\d+/)
          let title = rawKey
          if (match) {
            const id = parseInt(match[0])
            title = getTitle(id)
          }
          countMap[title] = (countMap[title] || 0) + item.total
        }
      } else {
        const apiPath =
          filterType === 'referral' ? '/referral-guidances/summary' : '/form-ppk/summary'

        const data = await fetchSummary(apiPath)

        data.forEach((item) => {
          const rawKey = item.question_key ?? item.question ?? 'ไม่ทราบอาการ'
          const match = rawKey.match(/\d+/)
          let title = rawKey
          if (match) {
            const id = parseInt(match[0])
            title = getTitle(id)
          }
          countMap[title] = item.total
        })
      }

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

        {loading && <LoadingSpinner message="กำลังโหลดข้อมูล..." size={28} />}

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
