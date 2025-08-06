'use client'

import React, { useState, useEffect, useRef } from 'react'

export interface Question18Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
}

interface Props {
  onResult: (data: Question18Result) => void
}

export default function Question18_AVFWound({ onResult }: Props) {
  const [extraNote, setExtraNote] = useState('')
  const hasEmittedRef = useRef(false)

  const questionResultBase = {
    question: 'AVFWoundFollowup',
    question_code: 18,
    question_title: 'แผลจากการทำ AVF (สำหรับผู้ป่วยล้างไต)',
    clinic: ['surg'],
    isReferCase: false,
  }

  // ฟังก์ชันสำหรับส่งผลลัพธ์กลับ
  const emitResult = (noteText: string) => {
    const trimmedNote = noteText.trim()
    const symptoms = ['avf_wound']
    if (trimmedNote) symptoms.push('custom_note')

    onResult({
      ...questionResultBase,
      note: trimmedNote || 'ติดตามแผล AVF',
      symptoms,
    })
  }

  // เรียกส่งผลลัพธ์ตอนเริ่มต้นครั้งเดียว
  useEffect(() => {
    if (!hasEmittedRef.current) {
      emitResult('')
      hasEmittedRef.current = true
    }
  }, [])

  // Handler เปลี่ยนแปลงหมายเหตุเพิ่มเติม
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setExtraNote(val)
    emitResult(val)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 leading-relaxed">
        แผลที่เกิดจากการผ่าตัดเส้นเลือดเพื่อทำการล้างไต (AVF - arteriovenous fistula)
      </p>

      <div>
        <label htmlFor="extraNote" className="block font-medium mt-2">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="extraNote"
          className="w-full border px-3 py-2 rounded"
          rows={2}
          value={extraNote}
          onChange={handleNoteChange}
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น แผลติดเชื้อ, บวม, ปวดแผล"
        />
      </div>
    </div>
  )
}
