'use client'

import React, { useState, useEffect, useRef } from 'react'

export interface Question17Result {
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
  onResult: (data: Question17Result | null) => void
  type: string
}

export default function Question17_DVT({ onResult, type }: Props) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')

  const prevResultRef = useRef<string>('')

  const symptomOptions = [
    'ขาข้างเดียวบวม',
    'เจ็บบริเวณน่อง',
    'ปวดขาเวลาเดิน',
    'ขาแดง ร้อน',
    'ข้อเท้าบวม',
  ]

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    )
  }

  useEffect(() => {
    const trimmedNote = customNote.trim()

    const symptoms = ['dvt', ...selectedSymptoms]
    if (trimmedNote) symptoms.push('custom_note')

    const clinic = ['muang']
    const isReferCase = symptoms.length > 1 // เพราะมี 'dvt' อยู่แล้ว

    const readableNote = [...selectedSymptoms]
    if (trimmedNote) readableNote.push(trimmedNote)
    const finalNote = readableNote.length > 0 ? readableNote.join(', ') : 'สงสัย DVT อาการไม่ระบุ'

    const resultKey = JSON.stringify({ clinic, finalNote, symptoms, isReferCase })

    if (prevResultRef.current !== resultKey) {
      prevResultRef.current = resultKey

      if (symptoms.length <= 1 && !trimmedNote) {
        onResult(null)
        return
      }

      onResult({
        question: 'DVTSuspect',
        question_code: 17,
        question_title: 'ภาวะสงสัยหลอดเลือดดำลึกอุดตัน (DVT)',
        clinic,
        note: finalNote,
        symptoms,
        isReferCase,
        routedBy: 'auto',
        type,
      })
    }
  }, [selectedSymptoms, customNote, onResult, type])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-2 font-medium">โปรดเลือกอาการที่เกี่ยวข้องกับภาวะ DVT:</p>
        <div className="space-y-2 mb-3">
          {symptomOptions.map((symptom) => (
            <label key={symptom} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedSymptoms.includes(symptom)}
                onChange={() => toggleSymptom(symptom)}
                className="w-4 h-4 border-gray-300 rounded"
              />
              <span>{symptom}</span>
            </label>
          ))}
        </div>

        <label htmlFor="customNote" className="block font-medium mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="customNote"
          title="หมายเหตุเพิ่มเติม"
          rows={2}
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder="เช่น ปวดขาขวา 3 วัน, เคยเป็นมาก่อน ฯลฯ"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
    </div>
  )
}
