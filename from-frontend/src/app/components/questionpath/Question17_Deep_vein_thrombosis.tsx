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
}

interface Props {
  onResult: (data: Question17Result | null) => void
}

export default function Question17_DVT({ onResult }: Props) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')

  // เก็บค่าล่าสุดของ onResult เพื่อเปรียบเทียบ
  const prevResultRef = useRef<string>('')

  const symptomOptions = [
    'ขาข้างเดียวบวม',
    'เจ็บบริเวณน่อง',
    'ปวดขาเวลาเดิน',
    'ขาแดง ร้อน',
    'ข้อเท้าบวม',
  ]

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    )
  }

  useEffect(() => {
    const trimmedNote = customNote.trim()
    const noteParts = [...selectedSymptoms]
    if (trimmedNote) noteParts.push(trimmedNote)
    const finalNote = noteParts.length > 0 ? noteParts.join(', ') : 'สงสัย DVT อาการไม่ระบุ'

    const symptoms = ['dvt', ...selectedSymptoms]
    if (trimmedNote) symptoms.push('custom_note')

    const isReferCase = selectedSymptoms.length > 0 || trimmedNote !== ''
    const clinic = ['muang']

    // สร้าง key เพื่อตรวจสอบผลลัพธ์เดิม
    const resultKey = JSON.stringify({ clinic, finalNote, symptoms, isReferCase })

    if (prevResultRef.current !== resultKey) {
      prevResultRef.current = resultKey
      onResult({
        question: 'DVTSuspect',
        question_code: 17,
        question_title: 'ภาวะสงสัยหลอดเลือดดำลึกอุดตัน (DVT)',
        clinic,
        note: finalNote,
        symptoms,
        isReferCase,
      })
    }
  }, [selectedSymptoms, customNote, onResult])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-2 font-medium">โปรดเลือกอาการที่เกี่ยวข้องกับภาวะ DVT:</p>
        <div className="space-y-2 mb-3">
          {symptomOptions.map(symptom => (
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
          หมายเหตุเพิ่มเติม(ถ้ามี)
        </label>
        <textarea
          id="customNote"
          rows={2}
          value={customNote}
          onChange={e => setCustomNote(e.target.value)}
          placeholder="เช่น ปวดขาขวา 3 วัน, เคยเป็นมาก่อน ฯลฯ"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
    </div>
  )
}
