'use client'

import React, { useEffect, useRef, useState } from 'react'

interface ThyroidResult {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  type: string
  // isReferCase: ไม่ส่งถ้าไม่ใช่ refer → ทำให้เป็น optional และใส่เฉพาะตอนเป็น true เท่านั้น
  isReferCase?: boolean
}

interface ThyroidProps {
  onResult: (result: ThyroidResult | null) => void
  type: string
}

export default function Question5_Thyroid({ onResult, type }: ThyroidProps) {
  const [isNewCase, setIsNewCase] = useState(false)
  const [hasPalpTremor, setHasPalpTremor] = useState(false)
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  // ใช้ ref กันลูปจาก onResult reference เปลี่ยน
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  // กันยิงซ้ำค่าเดิม
  const prevKeyRef = useRef<string>('__INIT__')

  useEffect(() => {
    if (!touched) {
      // ยังไม่แตะอะไร → ส่ง null ครั้งเดียว
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    const symptoms: string[] = ['thyroid']
    const noteParts: string[] = []
    let clinic: string[] = []

    if (isNewCase) {
      clinic = ['muang'] // New case → รพ.เมือง
      symptoms.push('thyroid_new')
      noteParts.push('New case')
    } else {
      // Follow-up: วันคู่ ENT, วันคี่ ศัลย์ (อิง day-of-month)
      const dayOfMonth = new Date().getDate()
      const isEven = dayOfMonth % 2 === 0
      clinic = [isEven ? 'ent' : 'surg']
      symptoms.push('thyroid_followup')
    }

    if (hasPalpTremor) {
      symptoms.push('palpitation_tremor')
      noteParts.push('มีอาการใจสั่น/มือสั่น')
    }

    const extra = note.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('thyroid_note')
    }

    const finalNote = noteParts.join(' | ') || undefined

    // เตรียม payload โดย “ไม่ใส่ isReferCase เลย” (เพราะไม่ใช่ refer)
    const payload: ThyroidResult = {
      question: 'ThyroidCase',
      question_code: 5,
      question_title: 'ไทรอยด์ (Thyroid)',
      clinic,
      note: finalNote,
      symptoms,
      type,
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [isNewCase, hasPalpTremor, note, type, touched])

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <p className="font-medium">Thyroid</p>

      <div className="flex flex-col gap-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isNewCase}
            onChange={(e) => { setIsNewCase(e.target.checked); setTouched(true) }}
            className="w-4 h-4"
          />
          <span>เป็น New case</span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasPalpTremor}
            onChange={(e) => { setHasPalpTremor(e.target.checked); setTouched(true) }}
            className="w-4 h-4"
          />
          <span>มีอาการใจสั่น / มือสั่น</span>
        </label>
      </div>

      <div>
        <label htmlFor="note" className="block font-medium mt-1 mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => { setNote(e.target.value); setTouched(true) }}
          rows={2}
          placeholder="ใส่รายละเอียดเพิ่มเติม"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
