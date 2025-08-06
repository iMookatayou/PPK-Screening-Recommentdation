'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getThaiDayName } from '@/lib/dateUtils'

export interface Question24Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
}

interface Props {
  onResult: (data: Question24Result) => void
}

export default function Question24_RetainForeignBody({ onResult }: Props) {
  const [risk, setRisk] = useState(false)
  const [note, setNote] = useState('')
  const hasSentRef = useRef(false)
  const todayName = getThaiDayName()

  const emitResult = (noteText: string, isRisk: boolean) => {
    const clinic = isRisk ? ['surg'] : ['er']
    const finalNote = isRisk
      ? `รอตรวจ OPD ศัลย์${noteText.trim() ? ' - ' + noteText.trim() : ''}`
      : noteText.trim() || 'สงสัยวัตถุปักคาในร่างกาย'

    onResult({
      question: 'RetainForeignBody',
      question_code: 24,
      question_title: 'สงสัยวัตถุปักคาในร่างกาย',
      clinic,
      note: finalNote,
      symptoms: ['retained_foreign_body'],
      isReferCase: true,
    })
  }

  useEffect(() => {
    if (!hasSentRef.current) {
      emitResult(note, risk)
      hasSentRef.current = true
    }
  }, [])

  useEffect(() => {
    if (hasSentRef.current) {
      emitResult(note, risk)
    }
  }, [note, risk])

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-gray-700 leading-relaxed">
        มีวัตถุขนาดใหญ่ปักคาแนวแพทย์อยู่ในร่างกาย หากเสี่ยงต่อการฟ้องร้องให้รอพบแพทย์ศัลย์ใน OPD
      </p>

      <div className="flex items-center gap-2 mt-1 mb-2">
        <input
          type="checkbox"
          id="risk"
          checked={risk}
          onChange={(e) => setRisk(e.target.checked)}
          className="accent-red-600"
        />
        <label htmlFor="risk" className="text-red-700 font-medium">
          มีความเสี่ยงต่อการฟ้องร้อง หรือเข้าข่ายต้องรอ OPD
        </label>
      </div>

      <label htmlFor="note" className="block font-medium mt-2 mb-1">
        หมายเหตุเพิ่มเติม (ถ้ามี)
      </label>
      <textarea
        id="note"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
        placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น ตำแหน่งวัตถุที่ปักอยู่"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  )
}
