'use client'

import React, { useState, useEffect, useRef } from 'react'

export interface Question18Result {
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
  onResult: (data: Question18Result | null) => void
  type: string
}

export default function Question18_AVFWound({ onResult, type }: Props) {
  const [extraNote, setExtraNote] = useState('')
  const prevKeyRef = useRef<string>('')

  useEffect(() => {
    const trimmedNote = extraNote.trim()

    const symptoms = ['avf_wound']
    if (trimmedNote) symptoms.push('custom_note')

    const note = trimmedNote || 'ติดตามแผล AVF'
    const isReferCase = true
    const clinic = ['surg']

    const resultKey = JSON.stringify({ note, clinic, symptoms, isReferCase })

    if (prevKeyRef.current !== resultKey) {
      prevKeyRef.current = resultKey

      if (!trimmedNote && symptoms.length <= 1) {
        onResult(null)
        return
      }

      onResult({
        question: 'AVFWoundFollowup',
        question_code: 18,
        question_title: 'แผลจากการทำ AVF (สำหรับผู้ป่วยล้างไต)',
        clinic,
        note,
        symptoms,
        isReferCase,
        routedBy: 'auto',
        type,
      })
    }
  }, [extraNote, onResult, type])

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <p className="leading-relaxed">
        แผลที่เกิดจากการผ่าตัดเส้นเลือดเพื่อทำการล้างไต (AVF - arteriovenous fistula)
      </p>

      <div>
        <label htmlFor="extraNote" className="block font-medium mt-2">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="extraNote"
          title="หมายเหตุเพิ่มเติม"
          className="w-full border px-3 py-2 rounded"
          rows={2}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น แผลติดเชื้อ, บวม, ปวดแผล"
        />
      </div>
    </div>
  )
}
