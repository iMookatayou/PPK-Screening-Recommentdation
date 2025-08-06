'use client'

import React, { useEffect, useState } from 'react'
import { getThaiDayNumber } from '@/lib/dateUtils'

interface CSpineInjuryResult {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  routedBy: 'auto-day'
  dayOfWeek: number
  type: string 
}

interface CSpineInjuryProps {
  onResult: (result: CSpineInjuryResult) => void
  type: string 
}

export default function Question2_CSpineInjury({ onResult, type }: CSpineInjuryProps) {
  const [clinic, setClinic] = useState<string>('')
  const [note, setNote] = useState<string>('')

  useEffect(() => {
    const day = getThaiDayNumber()
    const routedClinic = (day === 2 || day === 4) ? 'surg' : 'ortho' // อังคาร/พฤหัส → surg
    setClinic(routedClinic)

    const symptoms: string[] = ['cspine_injury']
    if (note.trim()) symptoms.push('cspine_injury_note')

    onResult({
      question: 'CSpineInjury',
      question_code: 2,
      question_title: 'บาดเจ็บบริเวณกระดูกคอ',
      clinic: [routedClinic],
      note: note.trim() !== '' ? note.trim() : undefined,
      symptoms,
      routedBy: 'auto-day',
      dayOfWeek: day,
      type, 
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, type])

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <p>ระบบจะเลือกแผนกส่งต่ออัตโนมัติตามวันในสัปดาห์</p>
      <div>
        <label htmlFor="note" className="block font-medium mt-3 mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="ใส่รายละเอียดอื่น ๆ..."
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
