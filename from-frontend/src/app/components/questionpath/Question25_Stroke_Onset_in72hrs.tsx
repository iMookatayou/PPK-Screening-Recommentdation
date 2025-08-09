'use client'

import React, { useState, useEffect, useRef } from 'react'

export interface Question25Result {
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
  onResult: (data: Question25Result | null) => void
  type: string
}

export default function Question25_StrokeSuspect({ onResult, type }: Props) {
  const [timeCategory, setTimeCategory] = useState<'' | 'within72' | '72to14d' | 'over14d'>('')
  const [vitalStable, setVitalStable] = useState(false)
  const [note, setNote] = useState('')
  const prevKey = useRef('')

  const getLabel = (val: string) => {
    switch (val) {
      case 'within72':
        return 'ภายใน 72 ชม.'
      case '72to14d':
        return '> 72 ชม. ถึง 2 สัปดาห์'
      case 'over14d':
        return '> 2 สัปดาห์ขึ้นไป'
      default:
        return ''
    }
  }

  useEffect(() => {
    const symptoms = ['stroke_suspect']
    const label = getLabel(timeCategory)

    if (!timeCategory) {
      onResult(null)
      return
    }

    let clinic: string[] = []
    if (timeCategory === 'within72') {
      clinic = ['er']
    } else if ((timeCategory === '72to14d' || timeCategory === 'over14d') && vitalStable) {
      clinic = timeCategory === '72to14d' ? ['med'] : ['muang']
    } else {
      onResult(null)
      return
    }

    const trimmedNote = note.trim()
    const finalNote = `Onset: ${label}${trimmedNote ? ' - ' + trimmedNote : ''}`
    const key = JSON.stringify({ clinic, finalNote, symptoms })

    if (prevKey.current !== key) {
      prevKey.current = key

      onResult({
        question: 'StrokeSuspect',
        question_code: 25,
        question_title: 'สงสัยภาวะ Stroke',
        clinic,
        note: finalNote,
        symptoms,
        isReferCase: true,
        routedBy: 'auto',
        type
      })
    }
  }, [timeCategory, vitalStable, note, type, onResult])

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label htmlFor="stroke-time" className="text-gray-700 font-medium">
        สงสัย Stroke Onset โปรดเลือกช่วงเวลา:
      </label>
      <select
        id="stroke-time"
        title="ช่วงเวลาเกิดอาการ"
        value={timeCategory}
        onChange={(e) => setTimeCategory(e.target.value as any)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="">-- เลือกช่วงเวลา --</option>
        <option value="within72">ภายใน 72 ชม.</option>
        <option value="72to14d">&gt; 72 ชม. ถึง 2 สัปดาห์</option>
        <option value="over14d">&gt; 2 สัปดาห์ขึ้นไป</option>
      </select>

      {(timeCategory === '72to14d' || timeCategory === 'over14d') && (
        <label className="flex items-center gap-2 text-blue-800">
          <input
            type="checkbox"
            checked={vitalStable}
            onChange={(e) => setVitalStable(e.target.checked)}
            className="accent-blue-600"
          />
          ยืนยันว่า Vital sign stable
        </label>
      )}

      <label htmlFor="note" className="block font-medium mt-2 mb-1">
        หมายเหตุเพิ่มเติม (ถ้ามี)
      </label>
      <textarea
        id="note"
        title="หมายเหตุเพิ่มเติม"
        className="border rounded p-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
        placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น แขนขาอ่อนแรง พูดไม่ชัด อื่น ๆ"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  )
}
