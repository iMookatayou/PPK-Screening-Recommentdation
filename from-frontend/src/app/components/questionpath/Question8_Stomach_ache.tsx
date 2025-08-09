'use client'

import { useEffect, useRef, useState } from 'react'

type StomachPainLocation = 'rlq' | 'epigastric'

export interface Question8Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
  type: string
}

interface Question8Props {
  onResult: (result: Question8Result | null) => void
  type: string
}

export default function Question8_Stomach_ache({ onResult, type }: Question8Props) {
  const [location, setLocation] = useState<StomachPainLocation | ''>('')
  const [painScale, setPainScale] = useState<number>(3)
  const [noteExtra, setNoteExtra] = useState<string>('')

  const prevKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!location) {
      if (prevKeyRef.current !== 'null') {
        prevKeyRef.current = 'null'
        onResult(null)
      }
      return
    }

    const symptoms: string[] = ['abdominal_pain', location]
    let clinic: string[] = []
    const noteParts: string[] = []

    if (location === 'rlq') {
      clinic = ['surg']
      noteParts.push('ปวดท้องน้อยขวา (สงสัย Appendicitis)')
    } else if (location === 'epigastric') {
      clinic = ['muang']
      noteParts.push('จุกแน่นใต้ลิ้นปี่ (สงสัย Gastritis, Dyspepsia)')
    }

    noteParts.push(`ระดับความเจ็บปวด: ${painScale}/7`)

    if (noteExtra.trim()) {
      noteParts.push(`หมายเหตุ: ${noteExtra.trim()}`)
    }

    const note = noteParts.join(' | ')

    const key = JSON.stringify({
      clinic,
      location,
      painScale,
      noteExtra,
      type,
    })

    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResult({
        question: 'StomachAche',
        question_code: 8,
        question_title: 'ปวดท้อง',
        clinic,
        note,
        symptoms,
        isReferCase: true,
        type,
      })
    }
  }, [location, painScale, noteExtra, type, onResult])

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
