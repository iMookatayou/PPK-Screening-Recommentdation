'use client'

import React, { useEffect, useState, useRef } from 'react'

export interface Question20Result {
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
  onResult: (result: Question20Result | null) => void
  type: string
}

const symptomOptions = [
  { value: 'pain', label: 'ปวด' },
  { value: 'swelling', label: 'บวม' },
  { value: 'numbness', label: 'ชา' },
  { value: 'pale', label: 'ซีด' },
  { value: 'cold', label: 'เย็น' },
  { value: 'no_pulse', label: 'คลำชีพจรส่วนปลายไม่ได้' },
]

export default function Question20_CompartmentSyndrome({ onResult, type }: Props) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [additionalNote, setAdditionalNote] = useState('')
  const prevKey = useRef<string>('')

  const handleCheckboxChange = (value: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  useEffect(() => {
    const baseSymptoms = ['compartment_syndrome']
    const symptoms = [...baseSymptoms]
    const noteParts: string[] = []

    if (selectedSymptoms.length > 0) {
      const labels = symptomOptions
        .filter((opt) => selectedSymptoms.includes(opt.value))
        .map((opt) => opt.label)
      noteParts.push(`อาการ: ${labels.join(', ')}`)
      symptoms.push(...selectedSymptoms)
    }

    if (additionalNote.trim()) {
      noteParts.push(`เพิ่มเติม: ${additionalNote.trim()}`)
      symptoms.push('custom_note')
    }

    const note = noteParts.length > 0 ? noteParts.join(' | ') : 'สงสัย Compartment Syndrome (ส่ง ER ด่วน)'
    const resultKey = JSON.stringify({ note, symptoms })

    if (prevKey.current !== resultKey) {
      prevKey.current = resultKey

      if (symptoms.length === 1 && !additionalNote.trim()) {
        onResult(null)
        return
      }

      onResult({
        question: 'CompartmentSyndrome',
        question_code: 20,
        question_title: 'ภาวะ Compartment Syndrome',
        clinic: ['er'],
        note,
        symptoms,
        isReferCase: true,
        routedBy: 'auto',
        type,
      })
    }
  }, [selectedSymptoms, additionalNote, type, onResult])

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <p>
        ภาวะ Compartment Syndrome: ปวด บวม ชา ซีด เย็น คลำชีพจรปลายไม่ได้ (ส่ง ER ด่วน)
      </p>

      <div className="space-y-2">
        <p className="font-medium">อาการที่พบ (เลือกได้หลายข้อ)</p>
        {symptomOptions.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedSymptoms.includes(opt.value)}
              onChange={() => handleCheckboxChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="note" className="block font-medium mt-2 mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="note"
          title="หมายเหตุเพิ่มเติม"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="เช่น ตำแหน่งที่เป็น, ลักษณะบวม หรือคำอธิบายเพิ่มเติม"
          value={additionalNote}
          onChange={(e) => setAdditionalNote(e.target.value)}
        />
      </div>
    </div>
  )
}
