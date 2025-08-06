'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'
import { getTitle } from '@/app/components/utils/getTitle'
import styles from './styles/PrintSummary.module.css'

export default function PrintFormPage() {
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [summary, setSummary] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const storedAnswers = localStorage.getItem('answers')
    const storedSummary = localStorage.getItem('patientSummary')
    if (storedAnswers) setAnswers(JSON.parse(storedAnswers))
    if (storedSummary) setSummary(JSON.parse(storedSummary))
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
    ) {
      age--
    }

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

  return (
    <div className={styles.printWrapper}>
      <div className={styles.printHeader}>
        <h1>แบบสรุปการคัดกรองผู้ป่วย</h1>
        <p className={styles.printedAt}>วันที่พิมพ์: {getPrintedDateTime()}</p>
      </div>

      {summary && (
        <div className={styles.patientInfo}>
          <p><strong>ชื่อ-นามสกุล:</strong> {summary.firstNameTh} {summary.lastNameTh}</p>
          <p><strong>อายุ:</strong> {getAgeFromBirthDate(summary.birthDate)} ปี</p>
          <p><strong>เพศ:</strong> {summary.gender === '1' ? 'ชาย' : summary.gender === '2' ? 'หญิง' : 'ไม่ระบุ'}</p>
          <p><strong>สิทธิการรักษา:</strong> {summary.maininscl_name || 'ไม่ระบุ'}</p>
          <p><strong>วันที่เริ่มต้นสิทธิ:</strong> {summary.issueDate || 'ไม่ระบุ'}</p>
          <p><strong>วันหมดอายุสิทธิ:</strong> {summary.expiryDate || 'ไม่ระบุ'}</p>
        </div>
      )}

      <table className={styles.printTable}>
        <thead>
          <tr>
            <th>ข้อ</th>
            <th>คำถาม</th>
            <th>รายละเอียด</th>
            <th>ห้องตรวจ</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(answers).map(([key, data]) => {
            const qId = parseInt(key)
            const title = getTitle(qId)
            const note = data.note || '—'
            const clinic = clinicLabelMap[data.clinic] || data.clinic || 'ไม่ระบุ'
            return (
              <tr key={key}>
                <td>{qId}</td>
                <td>{title}</td>
                <td>{note}</td>
                <td>{clinic}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className={styles.printButtons}>
        <button onClick={handlePrint}>พิมพ์แบบฟอร์ม</button>
        <button onClick={handleGoBack}>กลับไปหน้าฟอร์ม</button>
      </div>

    </div>
  )
}
