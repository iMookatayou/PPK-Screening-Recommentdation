'use client'

import React, { useState, useEffect, useRef } from 'react'

export interface Question24Result {
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
  onResult: (data: Question24Result | null) => void
  type: string
}

export default function Question24_RetainForeignBody({ onResult, type }: Props) {
  const [risk, setRisk] = useState(false)
  const [note, setNote] = useState('')
  const prevKey = useRef('')

  useEffect(() => {
    const symptoms = ['retained_foreign_body']
    const clinic = risk ? ['surg'] : ['er']

    const trimmedNote = note.trim()
    const finalNote = risk
      ? `รอตรวจ OPD ศัลย์${trimmedNote ? ' - ' + trimmedNote : ''}`
      : trimmedNote || 'สงสัยวัตถุปักคาในร่างกาย'

    const key = JSON.stringify({ clinic, finalNote, symptoms })

    if (prevKey.current !== key) {
      prevKey.current = key

      if (!finalNote.trim()) {
        onResult(null)
        return
      }

      onResult({
        question: 'RetainForeignBody',
        question_code: 24,
        question_title: 'สงสัยวัตถุปักคาในร่างกาย',
        clinic,
        note: finalNote,
        symptoms,
        isReferCase: true,
        routedBy: 'auto',
        type
      })
    }
  }, [risk, note, type, onResult])

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
        title="หมายเหตุเพิ่มเติม"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
        placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น ตำแหน่งวัตถุที่ปักอยู่"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  )
}
