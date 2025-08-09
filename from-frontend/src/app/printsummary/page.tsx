'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'
import { getTitle } from '@/app/components/utils/getTitle'
import styles from './styles/PrintSummary.module.css'
import { AlertTriangle, ArrowLeft, Printer } from 'lucide-react'

export default function PrintFormPage() {
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedAnswers = localStorage.getItem('answers')
    const storedSummary = localStorage.getItem('patientSummary')

    if (storedAnswers) {
      setAnswers(JSON.parse(storedAnswers))
    }

    if (storedSummary) {
      setSummary(JSON.parse(storedSummary))
    }

    setIsLoading(false)
  }, [])

  const getAgeFromBirthDate = (birthDate?: string): string => {
    if (!birthDate || birthDate.length < 8) return 'ไม่ระบุ'
    const y = parseInt(birthDate.substring(0, 4), 10)
    const yearCE = y > 2500 ? y - 543 : y
    const m = parseInt(birthDate.substring(4, 6), 10) - 1
    const d = parseInt(birthDate.substring(6, 8), 10)
    const birth = new Date(yearCE, m, d)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) age--
    return isNaN(age) ? 'ไม่ระบุ' : age.toString()
  }

  const getPrintedDateTime = (): string => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear() + 543
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year} เวลา ${hours}:${minutes} น.`
  }

  const handlePrint = () => window.print()

  const handleGoBack = () => {
    localStorage.removeItem('answers')
    localStorage.removeItem('patientSummary')
    router.push('/formppk')
  }

  if (isLoading) return null

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <img src="/images/logoppk4.png" alt="โลโก้โรงพยาบาล" className={styles.logo} />
        <div className={styles.headerTextBox}>
          <p className={styles.headerText}>
            <span className={styles.hospitalName}>โรงพยาบาลพระปกเกล้า จังหวัดจันทบุรี</span>{' '}
            <span className={styles.formTitle}>แบบฟอร์มคัดกรองผู้ป่วย</span>
          </p>
        </div>
      </div>

      {!summary ? (
        <p className={styles.alert}>
          <AlertTriangle size={20} style={{ marginRight: 8 }} />
          ไม่พบข้อมูลผู้ป่วย — กรุณากรอกฟอร์มก่อน หรือดำเนินการต่อด้วยข้อมูลใหม่
        </p>
      ) : (
        <div className={styles.patientInfo}>
          <p><strong>ชื่อ-นามสกุล:</strong> {summary.titleNameTh} {summary.firstNameTh} {summary.lastNameTh}</p>
          <p><strong>เพศ:</strong> {summary.gender === '1' ? 'ชาย' : summary.gender === '2' ? 'หญิง' : 'ไม่ระบุ'}</p>
          <p><strong>อายุ:</strong> {getAgeFromBirthDate(summary.birthDate)} ปี</p>
          <p><strong>สิทธิการรักษา:</strong> {summary.maininscl_name || 'ไม่ระบุ'}</p>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ข้อ</th>
            <th>คำถาม</th>
            <th>รายละเอียด</th>
            <th>ห้องตรวจ</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(answers).length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center' }}>ไม่มีคำตอบในแบบฟอร์ม</td>
            </tr>
          ) : (
            Object.entries(answers).map(([key, data]) => {
              const code = parseInt(key)
              const title = getTitle(code)
              const note = data.note || '—'
              const clinic = clinicLabelMap[data.clinic] || data.clinic || 'ไม่ระบุ'
              return (
                <tr key={key}>
                  <td>{code}</td>
                  <td className={styles.questionTitle}>{title}</td>
                  <td>{note}</td>
                  <td>{clinic}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      <div className={styles.footer}>
        <p>ลงชื่อแพทย์ผู้ตรวจ: ...............................................................</p>
        <p>วันที่: {getPrintedDateTime()}</p>
        <div className={styles.buttonGroup}>
          <button onClick={handlePrint}>
            <Printer size={16} style={{ marginRight: 6 }} />
            พิมพ์แบบฟอร์ม
          </button>
          <button onClick={handleGoBack}>
            <ArrowLeft size={16} style={{ marginRight: 6 }} />
            กลับไปหน้าฟอร์ม
          </button>
        </div>
      </div>
    </div>
  )
}
