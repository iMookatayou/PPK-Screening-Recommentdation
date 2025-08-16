'use client'

import { useEffect, useRef, useState } from 'react'

type StomachPainLocation = 'rlq' | 'epigastric'

export interface Question8Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  type: string
  // isReferCase: ไม่ใช่ช้อย refer → ไม่ต้องส่ง
  isReferCase?: boolean
}

interface Question8Props {
  onResult: (result: Question8Result | null) => void
  type: string
}

export default function Question8_Stomach_ache({ onResult, type }: Question8Props) {
  const [location, setLocation] = useState<StomachPainLocation | ''>('')
  const [painScale, setPainScale] = useState<number>(3)
  const [noteExtra, setNoteExtra] = useState<string>('')

  // กันลูป & กันยิงซ้ำ
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  const prevKeyRef = useRef<string>('__INIT__')

  useEffect(() => {
    // ยังไม่เลือกอาการ → ส่ง null ครั้งเดียว
    if (!location) {
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    const symptoms: string[] = [
      'abdominal_pain',
      location,
      'pain_scale',
      `pain_scale_${painScale}`,
    ]
    const noteParts: string[] = []
    let clinic: string[] = []

    if (location === 'rlq') {
      clinic = ['surg']
      noteParts.push('ปวดท้องน้อยขวา (สงสัย Appendicitis)')
      symptoms.push('suspected_appendicitis')
    } else if (location === 'epigastric') {
      clinic = ['muang']
      noteParts.push('จุกแน่นใต้ลิ้นปี่ (สงสัย Gastritis, Dyspepsia)')
      symptoms.push('suspected_gastritis_dyspepsia')
    }

    noteParts.push(`ระดับความเจ็บปวด: ${painScale}/7`)

    const extra = noteExtra.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('abdominal_pain_note')
    }

    const note = noteParts.join(' | ') || undefined

    const payload: Question8Result = {
      question: 'StomachAche',
      question_code: 8,
      question_title: 'ปวดท้อง',
      clinic,
      note,
      symptoms,
      type,
      // ❌ ไม่ใส่ isReferCase เพราะไม่มีช้อย refer
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [location, painScale, noteExtra, type])

  return (
    <div className="space-y-5 text-sm text-gray-800">
      <div>
        <label htmlFor="locationSelect" className="block font-medium mb-1">
          อาการที่พบ
        </label>
        <select
          id="locationSelect"
          title="ตำแหน่งที่ปวด"
          value={location}
          onChange={(e) => setLocation(e.target.value as StomachPainLocation)}
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">-- กรุณาเลือก --</option>
          <option value="rlq">ปวดท้องน้อยขวา (สงสัย Appendicitis)</option>
          <option value="epigastric">จุกแน่นลิ้นปี่ (สงสัย Gastritis, Dyspepsia)</option>
        </select>
      </div>

      <div>
        <label htmlFor="painScale" className="block font-medium mb-1">
          ระดับความเจ็บปวด (1–7):
        </label>
        <input
          id="painScale"
          type="range"
          min={1}
          max={7}
          step={1}
          value={painScale}
          onChange={(e) => setPainScale(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 px-1 mt-1">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <div className="text-center text-sm text-gray-700 mt-1">
          ระดับ: <strong>{painScale}</strong>
        </div>
      </div>

      <div>
        <label htmlFor="noteExtra" className="block font-medium mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="noteExtra"
          value={noteExtra}
          onChange={(e) => setNoteExtra(e.target.value)}
          rows={2}
          className="w-full border px-3 py-2 rounded"
          placeholder="รายละเอียดเพิ่มเติม เช่น เคยผ่าตัดมาก่อน"
          title="หมายเหตุเพิ่มเติม"
        />
      </div>
    </div>
  )
}
