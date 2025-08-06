'use client'

import React, { useEffect, useState } from 'react'

interface CellulitisResult {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  type: string 
}

interface CellulitisProps {
  onResult: (result: CellulitisResult) => void
  type: string 
}

export default function Question3_Cellulitis({ onResult, type }: CellulitisProps) {
  const [isLargeWound, setIsLargeWound] = useState<boolean>(false)
  const [note, setNote] = useState<string>('')

  useEffect(() => {
    const clinic = isLargeWound ? 'surg' : 'muang'
    const symptoms = ['cellulitis']
    if (isLargeWound) symptoms.push('large_wound')

    let combinedNote = note.trim()
    if (isLargeWound) {
      combinedNote = `แผลขนาดใหญ่${combinedNote ? ' - ' + combinedNote : ''}`
    }

    onResult({
      question: 'Cellulitis',
      question_code: 3,
      question_title: 'Cellulitis / แมลงสัตว์กัดต่อย',
      clinic: [clinic],
      note: combinedNote || undefined,
      symptoms,
      isReferCase: false,
      type, 
    })
  }, [isLargeWound, note, type])

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <p>ผู้ป่วยมีอาการ Cellulitis / แมลงสัตว์กัดต่อย และมีแผลขนาดใหญ่หรือไม่?</p>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isLargeWound}
          onChange={(e) => setIsLargeWound(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
        />
        <span>มีแผลขนาดใหญ่</span>
      </label>

      <div>
        <label htmlFor="note" className="block font-medium mt-2 mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="เช่น มีหนอง หรือรอยแดงกว้าง"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
