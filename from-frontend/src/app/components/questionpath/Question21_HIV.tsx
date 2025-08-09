'use client'

import React, { useState, useEffect, useRef } from 'react'

export interface Question21Result {
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

interface Question21_HIVProps {
  onResult: (result: Question21Result | null) => void
  type: string
}

export default function Question21_HIV({ onResult, type }: Question21_HIVProps) {
  const [note, setNote] = useState('')
  const prevKey = useRef('')

  useEffect(() => {
    const baseSymptoms = ['hiv_exposure']
    const symptoms = [...baseSymptoms]
    const trimmed = note.trim()
    const noteText = trimmed ? `รายละเอียดเพิ่มเติม: ${trimmed}` : 'ผู้สัมผัสหรือสงสัยติดเชื้อ HIV'

    if (trimmed) symptoms.push('custom_note')

    const currentKey = JSON.stringify({ note: noteText, symptoms })

    if (prevKey.current !== currentKey) {
      prevKey.current = currentKey

      if (!trimmed) {
        onResult(null)
        return
      }

      onResult({
        question: 'HIVExposure',
        question_code: 21,
        question_title: 'ผู้สัมผัสหรือสงสัยติดเชื้อ HIV',
        clinic: ['er'],
        note: noteText,
        symptoms,
        isReferCase: true,
        routedBy: 'auto',
        type,
      })
    }
  }, [note, type, onResult])

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-gray-700 leading-relaxed">
        ผู้สัมผัสหรือสงสัยติดเชื้อ HIV (ระบบจะส่งต่อไป ER ทันที)
      </p>

      <label htmlFor="note" className="block font-medium mt-2 mb-1">
        หมายเหตุเพิ่มเติม (ถ้ามี)
      </label>
      <input
        id="note"
        type="text"
        title="รายละเอียดเพิ่มเติม"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ระบุประวัติเสี่ยงหรือรายละเอียด"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
