'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface Question23Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  routedBy: 'auto'
  type: string
}

interface Props {
  onResult: (result: Question23Result | null) => void
  type: string
}

export default function Question23_JawLock({ onResult, type }: Props) {
  const [isReferCase, setIsReferCase] = useState(false)
  const [note, setNote] = useState('')

  // กันลูป onResult
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  useEffect(() => {
    const clinic = ['er'] // ขากรรไกรค้าง → ER
    const symptoms = ['jaw_lock', isReferCase ? 'refer_case' : 'new_case']
    if (note.trim()) symptoms.push('custom_note')

    onResultRef.current({
      question: 'JawLock',
      question_code: 23,
      question_title: 'ขากรรไกรค้าง (New / Refer)',
      clinic,
      note: note.trim() || undefined,
      symptoms,
      isReferCase,
      routedBy: 'auto',
      type,
    })
  }, [isReferCase, note, type])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p className="leading-relaxed">
        ขากรรไกรค้าง
      </p>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isReferCase}
          onChange={(e) => setIsReferCase(e.target.checked)}
          className="w-4 h-4"
        />
        <span>Case Refer</span>
      </label>

      <div>
        <label htmlFor="note" className="block font-medium mt-2 mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น ระยะเวลาที่ค้าง ล็อกซ้าย/ขวา เคยเป็นมาก่อน ฯลฯ"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
