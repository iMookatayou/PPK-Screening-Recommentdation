'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

export interface HandInjuryResult {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  type: string
}

interface HandInjuryProps {
  onResult: (result: HandInjuryResult) => void
  type: string
}

export default function Question1_HandInjury({ onResult, type }: HandInjuryProps) {
  const [isReferCase, setIsReferCase] = useState(false)
  const [note, setNote] = useState('')

  // ทำ callback ให้เสถียรด้วย ref (กัน identity เปลี่ยนทุก render ของพ่อ)
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  // คำนวณ payload จาก state ปัจจุบัน (มาตรฐาน noteParts → join(' | '))
  const payload = useMemo<HandInjuryResult>(() => {
    const clinics = isReferCase ? ['surg'] : ['ortho']

    const noteParts: string[] = []
    const extra = note.trim()
    if (extra) noteParts.push(extra)
    const finalNote = noteParts.join(' | ') || undefined

    const symptoms = [
      'hand_injury',
      ...(isReferCase ? ['manual_refer'] : []),
      ...(extra ? ['hand_injury_note'] : []),
    ]

    return {
      question: 'HandInjury',
      question_code: 1,
      question_title: 'บาดเจ็บที่มือ',
      clinic: clinics,
      note: finalNote,
      symptoms,
      isReferCase,
      type,
    }
  }, [isReferCase, note, type])

  // เรียก onResult เฉพาะตอน payload เปลี่ยนจริง ๆ
  const prevKeyRef = useRef<string>('')
  useEffect(() => {
    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [payload])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p>ผู้ป่วยมีอาการบาดเจ็บที่มือ</p>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isReferCase}
          onChange={(e) => setIsReferCase(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
        />
        <span>Case Refer</span>
      </label>

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
