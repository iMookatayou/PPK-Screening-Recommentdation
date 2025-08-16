'use client'

import React, { useState, useEffect, useRef } from 'react'

export interface Question22Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
  routedBy: 'auto'
  type: string
}

interface Props {
  onResult: (result: Question22Result | null) => void
  type: string
}

export default function Question22_PEP({ onResult, type }: Props) {
  const [note, setNote] = useState('')
  const [isAfterHours, setIsAfterHours] = useState(false)
  const prevKey = useRef('')

  useEffect(() => {
    const trimmed = note.trim()

    const symptoms = ['occupational_pep', ...(trimmed ? ['custom_note'] : [])]
    const finalNote =
      trimmed ? `${trimmed}` : 'ขอรับ PEP เจ้าหน้าที่'

    // ในเวลาราชการไปอาชีวเวชกรรม นอกเวลาราชการไป ER
    const clinic = isAfterHours ? ['er'] : ['occmed']
    const isReferCase = true

    const key = JSON.stringify({ clinic, finalNote, symptoms, isReferCase, type })
    if (prevKey.current !== key) {
      prevKey.current = key
      onResult({
        question: 'OccupationalPEP',
        question_code: 22,
        question_title: 'PEP สำหรับเจ้าหน้าที่ (Occupational PEP)',
        clinic,
        note: finalNote,
        symptoms,
        isReferCase,
        routedBy: 'auto',
        type,
      })
    }
  }, [note, isAfterHours, type, onResult])

  return (
    <div className="flex flex-col gap-2 text-sm text-gray-800">
      <p className="leading-relaxed">
        PEP สำหรับเจ้าหน้าที่ (รวมทั้งเจ้าหน้าที่จาก รพช./รพท.)
      </p>

      <div className="flex items-center gap-2 mt-1">
        <input
          type="checkbox"
          id="afterHours"
          checked={isAfterHours}
          onChange={(e) => setIsAfterHours(e.target.checked)}
          className="accent-blue-600"
        />
        <label htmlFor="afterHours" className="font-medium">
          กรณีนอกเวลาราชการ (จะส่งตรวจที่ ER)
        </label>
      </div>

      <label htmlFor="note" className="block font-medium mt-3 mb-1">
        หมายเหตุเพิ่มเติม (ถ้ามี)
      </label>
      <textarea
        id="note"
        title="หมายเหตุเพิ่มเติม"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
        placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น ประเภทการสัมผัส เวลา หรือชื่อเจ้าหน้าที่"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  )
}
