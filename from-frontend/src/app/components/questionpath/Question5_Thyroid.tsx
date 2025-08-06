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
}

interface ThyroidProps {
  onResult: (result: ThyroidResult) => void
}

export default function Question5_Thyroid({ onResult }: ThyroidProps) {
  const [isNewCase, setIsNewCase] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    const day = getThaiDayNumber()
    const weekday = day >= 1 && day <= 5 ? day : 1 // Treat Sat/Sun as Monday

    let clinic = ''
    const symptoms: string[] = ['thyroid']
    const noteParts: string[] = []

    if (isNewCase) {
      clinic = 'muang'
      symptoms.push('thyroid_new')
      noteParts.push('New Case')
    } else {
      clinic = weekday % 2 === 0 ? 'ent' : 'surg'
      symptoms.push('thyroid_followup')
      noteParts.push('Follow-up')
    }

    if (note.trim()) {
      noteParts.push(note.trim())
    }

    const fullNote = noteParts.join(' | ')

    onResult({
      question: 'ThyroidCase',
      question_code: 5,
      question_title: 'ไทรอยด์ (Thyroid)',
      clinic: [clinic],
      note: fullNote,
      symptoms,
      isReferCase: true,
    })
  }, [isNewCase, note])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p>ผู้ป่วยเป็นไทรอยด์ เป็น New Case หรือไม่?</p>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isNewCase}
          onChange={(e) => setIsNewCase(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
        />
        <span>New Case</span>
      </label>

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
