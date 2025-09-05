'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './styles/PrintSummary.module.css'
import { ArrowLeft, Printer } from 'lucide-react'
import Image from 'next/image'

type Topic = { code: string; title: string; note: string }

type PrintSummaryData = {
  patientName: string
  printedAt?: string | number | Date   // เวลา generate/สั่งพิมพ์
  routedBy: string                     // ผู้ส่งต่อ/ผู้คัดกรอง
  rightsNote: string                   // สิทธิการรักษา
  diseases?: string[]                  // โรคที่เกี่ยวข้อง (ถ้ามี)
  topics: Topic[]                      // รายการคำถาม/โรค + note
  referredClinics?: Array<string | { label?: string; name?: string; text?: string }>
}

const DEFAULT_DATA: PrintSummaryData = {
  patientName: '',
  printedAt: undefined,
  routedBy: '',
  rightsNote: '',
  diseases: [],
  topics: [],
  referredClinics: [],
}

// map โค้ด → ป้ายชื่อห้องตรวจ
const clinicLabelMap: Record<string, string> = {
  surg: 'OPD ศัลย์',
  ortho: 'OPD Ortho',
  muang: 'รพ.เมือง',
  er: 'ER',
  ent: 'OPD ENT',
  uro: 'OPD URO ศัลย์',
  obgy: 'OPD นรีเวช',
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

function toThaiDateTime(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = d.getFullYear() + 543
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} เวลา ${hh}:${mi} น.`
}

function safeParseDate(v: PrintSummaryData['printedAt']): Date {
  if (!v) return new Date()
  try {
    if (v instanceof Date) return v
    if (typeof v === 'number') return new Date(v)
    const d = new Date(v)
    return isNaN(d.getTime()) ? new Date() : d
  } catch {
    return new Date()
  }
}

export default function PrintSummaryPage() {
  const router = useRouter()
  const search = useSearchParams()
  const [data, setData] = useState<PrintSummaryData>(DEFAULT_DATA)

  // โหลดจาก localStorage (ฝั่ง client)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('printSummary')
      if (!raw) {
        setData(DEFAULT_DATA)
        return
      }
      const parsed = JSON.parse(raw) as Partial<PrintSummaryData>
      setData({
        patientName: (parsed.patientName ?? '').toString(),
        printedAt: parsed.printedAt ?? Date.now(),
        routedBy: (parsed.routedBy ?? '').toString(),
        rightsNote: (parsed.rightsNote ?? '').toString(),
        diseases: Array.isArray(parsed.diseases) ? parsed.diseases : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        referredClinics: Array.isArray(parsed.referredClinics) ? parsed.referredClinics : [],
      })
    } catch {
      setData(DEFAULT_DATA)
    }
  }, [])

  // autoPrint=1 จะสั่งพิมพ์อัตโนมัติเมื่อข้อมูลพร้อม
  useEffect(() => {
    const auto = search.get('autoPrint')
    if (!auto) return
    if (data.topics && data.topics.length >= 0) {
      // เว้น 300ms ให้ฟอนต์/ภาพ/DOM เสถียรก่อน
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [search, data.topics])

  // แสดงผล
  const rightsDisplay =
    data.rightsNote && data.rightsNote.trim() ? data.rightsNote : 'ไม่มีการบันทึกสิทธิการรักษา'
  const clinicList = useMemo(() => extractClinicLabels(data.referredClinics), [data.referredClinics])
  const printedAtText = useMemo(() => toThaiDateTime(safeParseDate(data.printedAt)), [data.printedAt])

  const handlePrint = () => window.print()
  const handleGoBack = () => {
    try { localStorage.removeItem('printSummary') } catch {}
    router.push('/formppk')
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.hLeft}>
          <Image
            src="/images/logoppk4.png"
            alt="โลโก้โรงพยาบาล"
            width={64}
            height={64}
            priority
            className={styles.logo}
          />
        </div>
        <div className={styles.hRight}>
          <h1 className={styles.hospitalName}>โรงพยาบาลพระปกเกล้า จังหวัดจันทบุรี</h1>
          <div className={styles.formTitle}>แบบฟอร์มสรุปการคัดกรองผู้ป่วย</div>
          <div className={styles.subInfo}>
            พิมพ์เมื่อ: {printedAtText}
            {data.routedBy ? <> · ผู้คัดกรอง: {data.routedBy}</> : null}
          </div>
        </div>
      </header>

      {/* Patient info */}
      <section className={styles.patientInfo}>
        <p>
          <strong>ชื่อ-นามสกุล:</strong>{' '}
          {data.patientName && data.patientName.trim() ? data.patientName : '___________'}
        </p>
        <p>
          <strong>สิทธิการรักษา:</strong> {rightsDisplay}
        </p>
        {data.diseases && data.diseases.length > 0 && (
          <p>
            <strong>โรคที่เกี่ยวข้อง:</strong> {data.diseases.join(', ')}
          </p>
        )}
      </section>

      {/* Table */}
      <section className={styles.tableSection}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 60 }}>ข้อ</th>
              <th>คำถาม / โรค</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {(!data.topics || data.topics.length === 0) ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>— ยังไม่มีข้อมูล —</td>
              </tr>
            ) : (
              data.topics.map((t, idx) => (
                <tr key={`${t.code}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td className={styles.questionTitle}>{t.title}</td>
                  <td>{t.note?.trim() ? t.note : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* ห้องตรวจที่เกี่ยวข้อง */}
      {clinicList.length > 0 && (
        <section className={styles.relatedClinics}>
          <strong>หมายเหตุ:</strong> ห้องตรวจที่เกี่ยวข้อง — {clinicList.join(', ')}
        </section>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <p>ลงชื่อผู้คัดกรอง: ...............................................................</p>

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
      </footer>
    </div>
  )
}
