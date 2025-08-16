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

type CaseType = 'new' | 'refer' | ''

export default function Question23_JawLock({ onResult, type }: Props) {
  const [caseType, setCaseType] = useState<CaseType>('')   // ← เลือก new หรือ refer
  const [note, setNote] = useState('')

  // กันลูป onResult + กันยิงซ้ำ
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  const prevKeyRef = useRef<string>('__INIT__')

  useEffect(() => {
    // ยังไม่เลือกประเภท → ส่ง null ครั้งเดียว
    if (!caseType) {
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    const clinic: string[] = ['er'] // ขากรรไกรค้าง → ER
    const isReferCase = caseType === 'refer'

    const symptoms: string[] = ['jaw_lock', isReferCase ? 'refer_case' : 'new_case']
    const trimmedNote = note.trim()
    if (trimmedNote) symptoms.push('jaw_lock_note')

    const payload: Question23Result = {
      question: 'JawLock',
      question_code: 23,
      question_title: 'ขากรรไกรค้าง (New / Refer)',
      clinic,
      note: trimmedNote || undefined,
      symptoms,
      isReferCase,
      routedBy: 'auto',
      type,
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [caseType, note, type])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p className="leading-relaxed">ขากรรไกรค้าง</p>

      {/* เลือกประเภทเคส: New vs Refer (radio) */}
      <div className="space-y-2">
        <p className="font-medium">ประเภทเคส</p>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="jawlock-case-type"
            value="new"
            checked={caseType === 'new'}
            onChange={() => setCaseType('new')}
            className="w-4 h-4"
          />
          <span>New case</span>
        </label>
        <label className="inline-flex items-center gap-2 ml-6">
          <input
            type="radio"
            name="jawlock-case-type"
            value="refer"
            checked={caseType === 'refer'}
            onChange={() => setCaseType('refer')}
            className="w-4 h-4"
          />
          <span>Refer case</span>
        </label>
      </div>

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
