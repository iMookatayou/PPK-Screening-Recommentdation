'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getThaiDayName } from '@/lib/dateUtils'

export interface Question22Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
}

interface Props {
  onResult: (result: Question22Result) => void
}

export default function Question22_PEP({ onResult }: Props) {
  const [note, setNote] = useState('')
  const [isAfterHours, setIsAfterHours] = useState(false)
  const hasSentRef = useRef(false)

  const emitResult = (noteText: string, afterHours: boolean) => {
    const symptoms = ['occupational_pep']

    const noteParts: string[] = []

    if (noteText.trim()) {
      noteParts.push(noteText.trim())
    }

    if (afterHours) {
      noteParts.push('กรณีนอกเวลาราชการ')
    }

    const finalNote =
      noteParts.length > 0 ? noteParts.join(' | ') : 'ขอรับ PEP เจ้าหน้าที่'

    onResult({
      question: 'OccupationalPEP',
      question_code: 22,
      question_title: 'PEP สำหรับเจ้าหน้าที่ (Occupational PEP)',
      clinic: afterHours ? ['er'] : ['occmed'],
      note: finalNote,
      symptoms,
      isReferCase: true,
    })
  }

  useEffect(() => {
    if (!hasSentRef.current) {
      emitResult(note, isAfterHours)
      hasSentRef.current = true
    }
  }, [])

  useEffect(() => {
    emitResult(note, isAfterHours)
  }, [note, isAfterHours])

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-gray-700 leading-relaxed">
        PEP สำหรับเจ้าหน้าที่ (รวมทั้งเจ้าหน้าที่จาก รพช./รพท.)
      </p>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="afterHours"
          checked={isAfterHours}
          onChange={(e) => setIsAfterHours(e.target.checked)}
          className="accent-blue-600"
        />
        <label htmlFor="afterHours" className="text-gray-800 font-medium">
          กรณีนอกเวลาราชการ (จะส่งตรวจที่ ER)
        </label>
      </div>

      <label htmlFor="note" className="block font-medium mt-2 mb-1">
        หมายเหตุเพิ่มเติม (ถ้ามี)
      </label>
      <textarea
        id="note"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
        placeholder="บันทึกรายละเอียดเพิ่มเติม "
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  )
}
