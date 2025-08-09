'use client'

import { useEffect, useState } from 'react'

export interface Question6Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  type: string
}

interface Question6Props {
  onResult: (result: Question6Result | null) => void
  type: string
}

export default function Question6_UTI({ onResult, type }: Question6Props) {
  const [hasSelected, setHasSelected] = useState(false)
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!hasSelected || gender === null) {
      onResult(null)
      return
    }

    const symptoms = ['pelvic_pain']
    const clinic = gender === 'male' ? ['surg'] : ['obgy']
    const noteItems = ['ปวดท้องน้อย / คลำพบก้อน']

    if (note.trim()) {
      noteItems.push(note.trim())
    }

    const result: Question6Result = {
      question: 'UTICase',
      question_code: 6,
      question_title: 'ทางเดินปัสสาวะ (UTI)',
      clinic,
      symptoms,
      note: noteItems.join(' | '),
      isReferCase: true,
      type,
    }

    setTimeout(() => {
      onResult(result)
    }, 0)
  }, [hasSelected, gender, note, type])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p>ผู้ป่วยมีอาการปวดท้องน้อย / คลำพบก้อน</p>

      <p className="font-medium">เลือกเพศของผู้ป่วย</p>
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="pelvic-gender"
            value="male"
            checked={gender === 'male'}
            onChange={() => {
              setGender('male')
              setHasSelected(true)
            }}
          />
          <span>ชาย</span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="pelvic-gender"
            value="female"
            checked={gender === 'female'}
            onChange={() => {
              setGender('female')
              setHasSelected(true)
            }}
          />
          <span>หญิง</span>
        </label>
      </div>

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
