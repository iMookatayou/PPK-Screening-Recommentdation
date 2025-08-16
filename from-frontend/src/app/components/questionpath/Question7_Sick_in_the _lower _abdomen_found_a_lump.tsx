'use client'

import { useEffect, useRef, useState } from 'react'

export interface Question7Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  type: string
  // isReferCase: ไม่เกี่ยว refer → ไม่ต้องส่ง
  isReferCase?: boolean
}

interface Props {
  onResult: (result: Question7Result | null) => void
  type: string
}

type Gender = 'male' | 'female' | 'unknown'
type ClinicKey = 'surg' | 'obgy'

export default function Question7_LowerAbdomenMass({ onResult, type }: Props) {
  const [note, setNote] = useState('')

  // เพศ (single select, เริ่มยังไม่เลือก)
  const [gender, setGender] = useState<Gender | ''>('')

  // ห้องตรวจ (โชว์เมื่อ gender = 'unknown')
  const [clinicUnknown, setClinicUnknown] = useState<ClinicKey | ''>('')

  // กันลูป/กันสแปม
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  const prevKeyRef = useRef('__INIT__')

  // เคลียร์ห้องตรวจเมื่อออกจาก unknown
  useEffect(() => {
    if (gender !== 'unknown' && clinicUnknown) setClinicUnknown('')
  }, [gender, clinicUnknown])

  useEffect(() => {
    // ยังไม่เลือกเพศ → ส่ง null ครั้งเดียว
    if (!gender) {
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    // คำนวณปลายทาง
    let clinic: string[] = []
    if (gender === 'male') clinic = ['surg']
    else if (gender === 'female') clinic = ['obgy']
    else {
      // เพศไม่ทราบ ต้องเลือกห้องตรวจ 1 อัน
      if (!clinicUnknown) {
        if (prevKeyRef.current !== 'WAIT_CLINIC') {
          prevKeyRef.current = 'WAIT_CLINIC'
          onResultRef.current(null)
        }
        return
      }
      clinic = [clinicUnknown]
    }

    // symptoms + note (optional)
    const symptoms = ['lower_abdomen_pain_or_mass']
    const noteItems: string[] = ['ปวดท้องน้อย / คลำพบก้อน']
    const extra = note.trim()
    if (extra) {
      noteItems.push(extra)
      symptoms.push('lump_note')
    }
    const finalNote = noteItems.join(' | ') || undefined

    const payload: Question7Result = {
      question: 'LowerAbdomenPainOrMass',
      question_code: 7,
      question_title: 'ปวดท้องน้อย / พบก้อน (Lower Abdominal Pain / Palpable Mass)',
      clinic,
      note: finalNote,
      symptoms,
      type,
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [gender, clinicUnknown, note, type])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p className="font-medium">ผู้ป่วยมีอาการปวดท้องน้อย / คลำพบก้อน</p>

      {/* เพศ */}
      <label htmlFor="gender" className="block font-medium">
        เพศของผู้ป่วย
      </label>
      <select
        id="gender"
        value={gender}
        onChange={(e) => setGender((e.target.value as Gender) || '')}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
      >
        <option value="">— เลือกเพศ —</option>
        <option value="male">ชาย</option>
        <option value="female">หญิง</option>
        <option value="unknown">ไม่ทราบแน่ชัด</option>
      </select>

      {/* ห้องตรวจ: โชว์เมื่อเพศไม่ทราบ */}
      {gender === 'unknown' && (
        <div>
          <label htmlFor="clinic-unknown" className="block font-medium">
            เลือกห้องตรวจ
          </label>
          <select
            id="clinic-unknown"
            value={clinicUnknown}
            onChange={(e) => setClinicUnknown((e.target.value as ClinicKey) || '')}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
          >
            <option value="">— เลือกห้องตรวจ —</option>
            <option value="surg">OPD ศัลย์ (ชาย)</option>
            <option value="obgy">OPD นรีเวช (หญิง)</option>
          </select>

          {!clinicUnknown && (
            <p className="text-xs text-red-600 mt-1">
              กรณีเพศไม่ทราบ โปรดเลือกห้องตรวจ
            </p>
          )}
        </div>
      )}

      {/* หมายเหตุ */}
      <div>
        <label htmlFor="note" className="block font-medium mt-2 mb-1">
          หมายเหตุเพิ่มเติม
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="ใส่รายละเอียดเพิ่มเติม เช่น คลำก้อนได้ชัดเจน"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
