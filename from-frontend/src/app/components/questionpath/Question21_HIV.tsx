'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getThaiDayName } from '@/lib/dateUtils'

export interface Question21Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
}

interface Question21_HIVProps {
  onResult: (result: Question21Result) => void
}

export default function Question21_HIV({ onResult }: Question21_HIVProps) {
  const [note, setNote] = useState('')
  const hasSent = useRef(false)
  const todayName = getThaiDayName()
  
  const emitResult = (text: string) => {
    const trimmed = text.trim()
    const symptoms = ['hiv_exposure']
    if (trimmed) symptoms.push('custom_note')

    onResult({
      question: 'HIVExposure',
      question_code: 21,
      question_title: 'ผู้สัมผัสหรือสงสัยติดเชื้อ HIV',
      clinic: ['er'],
      note: trimmed || 'ผู้สัมผัสหรือสงสัยติดเชื้อ HIV',
      symptoms,
      isReferCase: true,
    })
  }

  useEffect(() => {
    if (!hasSent.current) {
      emitResult(note)
      hasSent.current = true
    }
  }, [])

  useEffect(() => {
    if (hasSent.current) {
      emitResult(note)
    }
  }, [note])
  
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
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ระบุประวัติเสี่ยงหรือรายละเอียด"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
