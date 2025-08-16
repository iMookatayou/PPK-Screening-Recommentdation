'use client'

import React, { useEffect, useRef, useState } from 'react'
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
  const [note, setNote] = useState<string>('')

  // กันลูป: เก็บ callback ไว้ใน ref
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  // กันสแปม: ส่งเฉพาะตอน payload เปลี่ยนจริง
  const prevKeyRef = useRef<string>('__INIT__')

  useEffect(() => {
    const day = getThaiDayNumber()
    const routedClinic = (day === 2 || day === 4) ? 'surg' : 'ortho' // อังคาร/พฤหัส → surg

    const symptoms: string[] = ['cspine_injury']
    const noteParts: string[] = []
    const extra = note.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('cspine_injury_note')
    }
    const finalNote = noteParts.join(' | ') || undefined

    const payload: CSpineInjuryResult = {
      question: 'CSpineInjury',
      question_code: 2,
      question_title: 'บาดเจ็บบริเวณกระดูกคอ',
      clinic: [routedClinic],
      note: finalNote,
      symptoms,
      routedBy: 'auto-day',
      dayOfWeek: day,
      type,
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
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
          placeholder="ใส่รายละเอียดเพิ่มเติม"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
