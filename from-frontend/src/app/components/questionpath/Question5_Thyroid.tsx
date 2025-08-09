'use client'

import React, { useEffect, useState } from 'react'
import { getThaiDayNumber } from '@/lib/dateUtils'

interface ThyroidResult {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  type: string
}

interface ThyroidProps {
  onResult: (result: ThyroidResult | null) => void
  type: string
}

export default function Question5_Thyroid({ onResult, type }: ThyroidProps) {
  const [hasSelected, setHasSelected] = useState(false)
  const [isNewCase, setIsNewCase] = useState<boolean | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    // ถ้ายังไม่ได้เลือก new/followup ให้ส่ง null ออกไป
    if (!hasSelected || isNewCase === null) {
      onResult(null)
      return
    }

    const today = getThaiDayNumber()
    const weekday = today >= 1 && today <= 5 ? today : 1 // เปลี่ยนวันหยุดเป็นวันจันทร์

    // สร้างค่าผลลัพธ์
    const baseSymptoms: string[] = ['thyroid']
    const noteItems: string[] = []

    let clinic = ''
    if (isNewCase) {
      clinic = 'muang'
      baseSymptoms.push('thyroid_new')
      noteItems.push('New Case')
    } else {
      clinic = weekday % 2 === 0 ? 'ent' : 'surg'
      baseSymptoms.push('thyroid_followup')
      noteItems.push('Follow-up')
    }

    if (note.trim()) {
      noteItems.push(note.trim())
    }

    const result: ThyroidResult = {
      question: 'ThyroidCase',
      question_code: 5,
      question_title: 'ไทรอยด์ (Thyroid)',
      clinic: [clinic],
      note: noteItems.length > 0 ? noteItems.join(' | ') : undefined,
      symptoms: baseSymptoms,
      isReferCase: true,
      type,
    }

    onResult(result)
  }, [hasSelected, isNewCase, note, type])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p>ผู้ป่วยเป็นไทรอยด์ เป็น New Case หรือไม่?</p>

      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="thyroid-case"
            value="new"
            checked={isNewCase === true}
            onChange={() => {
              setIsNewCase(true)
              setHasSelected(true)
            }}
          />
          <span>New Case</span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="thyroid-case"
            value="followup"
            checked={isNewCase === false}
            onChange={() => {
              setIsNewCase(false)
              setHasSelected(true)
            }}
          />
          <span>Follow-up</span>
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
          placeholder="ใส่รายละเอียด เช่น เคยผ่าตัดแล้ว"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
