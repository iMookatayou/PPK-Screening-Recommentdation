'use client'

import { useEffect, useState } from 'react'
import { getThaiDayNumber } from '@/lib/dateUtils'

export interface Question10Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
}

interface Question10Props {
  onResult: (result: Question10Result) => void
}

export default function Question10_Injury({ onResult }: Question10Props) {
  const [choice, setChoice] = useState<'' | 'stable' | 'treated' | 'severe'>('')
  const [noteExtra, setNoteExtra] = useState('')
  const day = getThaiDayNumber()

  useEffect(() => {
    if (!choice) return

    let clinic = ''
    const symptoms: string[] = ['injury']
    let isReferCase = false
    const noteParts: string[] = []

    switch (choice) {
      case 'stable':
        clinic = 'nite'
        noteParts.push('Vital sign ปกติ และไม่มีบาดแผล')
        symptoms.push('stable')
        break
      case 'treated':
        clinic = 'nite'
        noteParts.push('ได้รับการรักษาแล้ว หรือไม่มีบาดแผลรุนแรง')
        symptoms.push('treated')
        break
      case 'severe':
        clinic = 'er'
        noteParts.push('บาดแผลรุนแรง (เลือดออกมาก / กระดูกหักรุนแรง)')
        symptoms.push('severe')
        isReferCase = true
        break
    }

    if (noteExtra.trim()) {
      noteParts.push(noteExtra.trim())
    }

    onResult({
      question: 'InjuryCase',
      question_code: 10,
      question_title: 'ประเมินเคสบาดเจ็บ',
      clinic: [clinic],
      note: noteParts.join(' | '),
      symptoms,
      isReferCase,
    })
  }, [choice, noteExtra])

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <label className="block font-medium">โปรดเลือกสถานการณ์ของผู้ป่วย:</label>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="injury-case"
            value="stable"
            checked={choice === 'stable'}
            onChange={() => setChoice('stable')}
          />
          Vital sign ปกติ และไม่มีบาดแผล
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="injury-case"
            value="treated"
            checked={choice === 'treated'}
            onChange={() => setChoice('treated')}
          />
          ได้รับการรักษาแล้ว หรือไม่มีบาดแผลรุนแรง
        </label>

        <label className="flex items-center gap-2 text-red-600">
          <input
            type="radio"
            name="injury-case"
            value="severe"
            checked={choice === 'severe'}
            onChange={() => setChoice('severe')}
          />
          บาดแผลรุนแรง (เลือดออกมาก / กระดูกหักรุนแรง)
        </label>
      </div>

      <div>
        <label htmlFor="noteExtra" className="block mt-2 font-medium">
          หมายเหตุเพิ่มเติม (ถ้ามี):
        </label>
        <textarea
          id="noteExtra"
          value={noteExtra}
          onChange={(e) => setNoteExtra(e.target.value)}
          rows={2}
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ตำแหน่งบาดแผล"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
