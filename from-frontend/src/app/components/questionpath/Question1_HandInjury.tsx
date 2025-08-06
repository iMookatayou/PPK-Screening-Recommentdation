'use client'

import React, { useEffect, useState } from 'react'

interface HandInjuryResult {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  type: string // form หรือ guide
}

interface HandInjuryProps {
  onResult: (result: HandInjuryResult) => void
  type: string // รับจากหน้าที่เรียกใช้ เช่น 'form' หรือ 'guide'
}

export default function Question1_HandInjury({ onResult, type }: HandInjuryProps) {
  const [isReferCase, setIsReferCase] = useState<boolean>(false)
  const [note, setNote] = useState<string>('')

  useEffect(() => {
    const clinics = isReferCase ? ['surg'] : ['ortho']
    const symptoms: string[] = []
    if (note.trim()) symptoms.push('hand_injury_note')

    onResult({
      question: 'HandInjury',
      question_code: 1,
      question_title: 'บาดเจ็บที่มือ',
      clinic: clinics,
      note: note.trim() !== '' ? note.trim() : undefined,
      symptoms: symptoms,
      isReferCase,
      type, 
    })
  }, [isReferCase, note, type])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p>ผู้ป่วยมีอาการบาดเจ็บที่มือ และเป็นเคส Refer จากที่อื่นหรือไม่?</p>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isReferCase}
          onChange={(e) => setIsReferCase(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
        />
        <span>เป็นเคส Refer</span>
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
          placeholder="ใส่รายละเอียดอื่น ๆ..."
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
