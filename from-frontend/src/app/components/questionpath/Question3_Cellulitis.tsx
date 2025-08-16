'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'

interface CellulitisResult {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string              
  symptoms: string[]
  isReferCase: boolean
  type: string
}

interface CellulitisProps {
  onResult: (result: CellulitisResult) => void
  type: string
}

export default function Question3_Cellulitis({ onResult, type }: CellulitisProps) {
  const [isLargeWound, setIsLargeWound] = useState(false)
  const [note, setNote] = useState('')

  // ทำ onResult ให้เสถียร
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const computed = useMemo(() => {
    const clinic = isLargeWound ? 'surg' : 'muang'
    const symptoms: string[] = ['cellulitis']
    const noteParts: string[] = []

    if (isLargeWound) {
      symptoms.push('large_wound')
      noteParts.push('แผลขนาดใหญ่')
    }

    const extra = note.trim()
    if (extra) {
      noteParts.push(extra)
      if (!symptoms.includes('cellulitis_note')) symptoms.push('cellulitis_note')
    }

    const mergedNote = noteParts.join(' | ')

    const payload: CellulitisResult = {
      question: 'Cellulitis',
      question_code: 3,
      question_title: 'Cellulitis / แมลงสัตว์กัดต่อย',
      clinic: [clinic],
      note: mergedNote,
      symptoms,
      isReferCase: false, 
      type,
    }

    const key = JSON.stringify({ clinic, symptoms, mergedNote, isLargeWound, type })
    return { key, payload }
  }, [isLargeWound, note, type])

  // กันยิงซ้ำค่าเดิม
  const prevKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevKeyRef.current !== computed.key) {
      prevKeyRef.current = computed.key
      onResultRef.current(computed.payload)
    }
  }, [computed])

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
          placeholder="ใส่รายละเอียดเพิ่มเติม"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
