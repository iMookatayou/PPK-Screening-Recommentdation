'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getThaiDayName } from '@/lib/dateUtils'

export interface Question25Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
}

interface Props {
  onResult: (data: Question25Result) => void
}

export default function Question25_StrokeSuspect({ onResult }: Props) {
  const [timeCategory, setTimeCategory] = useState<'' | 'within72' | '72to14d' | 'over14d'>('')
  const [vitalStable, setVitalStable] = useState(false)
  const [note, setNote] = useState('')
  const hasSent = useRef(false)
  const todayName = getThaiDayName()

  const emitResult = () => {
    if (!timeCategory) return

    let clinic: string[] = []
    if (timeCategory === 'within72') {
      clinic = ['er']
    } else if (timeCategory === '72to14d' && vitalStable) {
      clinic = ['med']
    } else if (timeCategory === 'over14d' && vitalStable) {
      clinic = ['muang']
    } else {
      return
    }

    const finalNote = `Onset: ${getLabel(timeCategory)}${note.trim() ? ' - ' + note.trim() : ''}`

    onResult({
      question: 'StrokeSuspect',
      question_code: 25,
      question_title: 'สงสัยภาวะ Stroke',
      clinic,
      note: finalNote,
      symptoms: ['stroke_suspect'],
      isReferCase: true,
    })
  }

  useEffect(() => {
    if (!hasSent.current) {
      emitResult()
      hasSent.current = true
    }
  }, [])

  useEffect(() => {
    if (hasSent.current) {
      emitResult()
    }
  }, [timeCategory, vitalStable, note])

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

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label htmlFor="stroke-time" className="text-gray-700 font-medium">
        สงสัย Stroke Onset โปรดเลือกช่วงเวลา:
      </label>
      <select
        id="stroke-time"
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
        className="border rounded p-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
        placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น แขนขาอ่อนแรง พูดไม่ชัด อื่น ๆ"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  )
}
