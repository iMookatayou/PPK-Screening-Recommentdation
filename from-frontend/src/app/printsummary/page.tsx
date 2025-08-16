'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './styles/PrintSummary.module.css'
import { ArrowLeft, Printer } from 'lucide-react'

type PrintSummaryData = {
  patientName: string
  printedAt: string
  routedBy: string
  rightsNote: string
  diseases?: string[]
  topics: Array<{ code: string; title: string; note: string }>
  referredClinics?: Array<string | { label?: string; name?: string; text?: string }>
}

const DEFAULT_DATA: PrintSummaryData = {
  patientName: '',
  printedAt: '',
  routedBy: '',
  rightsNote: '',
  diseases: [],
  topics: [],
  referredClinics: [],
}

// ใช้ clinicLabelMap เพื่อแปลงรหัส → ชื่อเต็ม
const clinicLabelMap: Record<string, string> = {
  surg: 'OPD ศัลย์',
  ortho: 'OPD Ortho',
  muang: 'รพ.เมือง',
  er: 'ER',
  ent: 'OPD ENT',
  uro: 'OPD URO ศัลย์',
  obgy: 'OPD นรีเวท',
  med: 'OPD MED',
  nite: 'นิติเวช',
  lr: 'LR',
  anc: 'OPD ANC',
  psych: 'OPD จิตเวช',
  opd203: 'OPD 203',
  dental: 'OPD ทันตกรรม',
  plastic: 'OPD ศัลย์ตกแต่ง',
  occmed: 'อาชีวเวชกรรม',
  ped: 'OPD กุมารเวชกรรม',
}

// ดึง label และแปลงด้วย clinicLabelMap
function extractClinicLabels(
  items?: Array<string | { label?: string; name?: string; text?: string }>
): string[] {
  if (!Array.isArray(items)) return []
  const labels = items
    .map((it) => {
      const raw =
        typeof it === 'string'
          ? it.trim()
          : (it.label || it.name || it.text || '').toString().trim()
      return clinicLabelMap[raw] || raw
    })
    .filter(Boolean)
  return Array.from(new Set(labels))
}

export default function PrintFormPage() {
  const [data, setData] = useState<PrintSummaryData>(DEFAULT_DATA)
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('printSummary')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PrintSummaryData>
        setData({
          patientName: parsed.patientName ?? DEFAULT_DATA.patientName,
          printedAt: parsed.printedAt ?? new Date().toISOString(),
          routedBy: parsed.routedBy ?? DEFAULT_DATA.routedBy,
          rightsNote: parsed.rightsNote ?? DEFAULT_DATA.rightsNote,
          diseases: Array.isArray(parsed.diseases) ? parsed.diseases : [],
          topics: Array.isArray(parsed.topics) ? parsed.topics : [],
          referredClinics: Array.isArray(parsed.referredClinics) ? parsed.referredClinics : [],
        })
      } else {
        setData(DEFAULT_DATA)
      }
    } catch {
      setData(DEFAULT_DATA)
    }
  }, [])

  const rightsDisplay =
    data.rightsNote && data.rightsNote.trim() ? data.rightsNote : 'ไม่มีการบันทึกสิทธิการรักษา'

  const clinicList = extractClinicLabels(data.referredClinics)

  const nowTH = () => {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yy = now.getFullYear() + 543
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yy} เวลา ${hh}:${mi} น.`
  }

  const handlePrint = () => window.print()
  const handleGoBack = () => {
    localStorage.removeItem('printSummary')
    router.push('/formppk')
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <img src="/images/logoppk4.png" alt="โลโก้โรงพยาบาล" className={styles.logo} />
        <div className={styles.headerTextBox}>
          <p className={styles.headerText}>
            <span className={styles.hospitalName}>โรงพยาบาลพระปกเกล้า จังหวัดจันทบุรี</span>{' '}
            <span className={styles.formTitle}>แบบฟอร์มคัดกรองผู้ป่วย</span>
          </p>
        </div>
      </div>

      {/* Patient info */}
      <div className={styles.patientInfo}>
        <p>
          <strong>ชื่อ-นามสกุล:</strong>{' '}
          {data.patientName && data.patientName.trim() ? data.patientName : '___________'}
        </p>
        <p>
          <strong>สิทธิการรักษา:</strong> {rightsDisplay}
        </p>
      </div>

      {/* Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: 60 }}>ข้อ</th>
            <th>คำถาม / โรค</th>
            <th>รายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          {data.topics.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>— ยังไม่มีข้อมูล —</td>
            </tr>
          ) : (
            data.topics.map((t, idx) => (
              <tr key={`${t.code}-${idx}`}>
                <td>{idx + 1}</td>
                <td className={styles.questionTitle}>{t.title}</td>
                <td>{t.note || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ห้องตรวจที่เกี่ยวข้อง */}
      {clinicList.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong>หมายเหตุ:</strong> ห้องตรวจที่เกี่ยวข้อง — {clinicList.join(', ')}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <p>ลงชื่อผู้คัดกรอง: ...............................................................</p>
        <p>วันที่: {nowTH()}</p>

        {/* ปุ่มเห็นบนจอ แต่จะถูกซ่อนตอนสั่งพิมพ์ */}
        <div className={`${styles.buttonGroup} no-print`}>
          <button className={styles.btn} onClick={handlePrint}>
            <Printer size={16} className={styles.icon} />
            พิมพ์แบบฟอร์ม
          </button>
          <button className={styles.btn} onClick={handleGoBack}>
            <ArrowLeft size={16} className={styles.icon} />
            กลับไปหน้าฟอร์ม
          </button>
        </div>
      </div>
    </div>
  )
}
