'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface Question18Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string | null   // เปลี่ยนเป็น string | null
  symptoms: string[]
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

  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    const trimmed = extraNote.trim()

    const symptoms = ['avf_wound']
    if (trimmed) symptoms.push('avf_note')

    // ถ้าไม่มีการกรอก note → ใช้ null
    const note = trimmed || null
    const clinic = ['surg']

    const key = JSON.stringify({ clinic, note, symptoms, type })
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current({
        question: 'AVFWoundFollowup',
        question_code: 18,
        question_title: 'แผลจากการทำ AVF (สำหรับผู้ป่วยล้างไต)',
        clinic,
        note,
        symptoms,
        routedBy: 'auto',
        type,
      })
    }
  }, [extraNote, type])

  return (
    <div className="text-sm text-gray-800 space-y-3">
      <p className="leading-relaxed">
        แผลที่เกิดจากการผ่าตัดเส้นเลือดเพื่อทำการล้างไต (AVF - arteriovenous fistula)
      </p>

      <div className="space-y-1.5">
        <label htmlFor="extraNote" className="block font-medium">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="extraNote"
          title="หมายเหตุเพิ่มเติม"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น แผลติดเชื้อ, บวม, ปวดแผล"
        />
      </div>
    </div>
  )
}
