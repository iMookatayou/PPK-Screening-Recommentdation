'use client'

import { useEffect, useRef, useState } from 'react'

interface Question11Result {
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

interface Question11Props {
  onResult: (result: Question11Result | null) => void
  type: string
}

export default function Question11_OSCC({ onResult, type }: Question11Props) {
  const [injuryStatus, setInjuryStatus] = useState<'hasInjury' | 'noInjury' | ''>('')
  const [extraNote, setExtraNote] = useState('')
  const prevKeyRef = useRef('')

  useEffect(() => {
    if (!injuryStatus) {
      if (prevKeyRef.current !== 'null') {
        prevKeyRef.current = 'null'
        onResult(null)
      }
      return
    }

    let clinic = ''
    const symptoms = ['oscc_case']
    const noteParts: string[] = []
    let isReferCase = false

    if (injuryStatus === 'hasInjury') {
      clinic = 'er'
      symptoms.push('injury')
      noteParts.push('มีการบาดเจ็บต่อร่างกาย หรือมีบาดแผล')
      isReferCase = true
    } else if (injuryStatus === 'noInjury') {
      clinic = 'nite'
      symptoms.push('no_injury')
      noteParts.push('ไม่มีการบาดเจ็บต่อร่างกาย')
    }

    if (extraNote.trim()) {
      noteParts.push(extraNote.trim())
    }

    const note = noteParts.join(' | ')
    const key = `${injuryStatus}-${extraNote.trim()}`

    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResult({
        question: 'OSCC',
        question_code: 11,
        question_title: 'ผู้ป่วย OSCC (ความรุนแรงทางร่างกาย/จิตใจ)',
        clinic: [clinic],
        note,
        symptoms,
        isReferCase,
        routedBy: 'auto',
        type,
      })
    }
  }, [injuryStatus, extraNote, type, onResult])

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <label className="block font-medium">
        ผู้ป่วย OSCC (เช่น Rape, ความรุนแรงในครอบครัว ฯลฯ) มีอาการอย่างไร?
      </label>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="oscc-injury"
            value="hasInjury"
            checked={injuryStatus === 'hasInjury'}
            onChange={() => setInjuryStatus('hasInjury')}
          />
          มีการบาดเจ็บต่อร่างกาย หรือมีบาดแผล
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="oscc-injury"
            value="noInjury"
            checked={injuryStatus === 'noInjury'}
            onChange={() => setInjuryStatus('noInjury')}
          />
          ไม่มีการบาดเจ็บต่อร่างกาย
        </label>
      </div>

      <div>
        <label htmlFor="extraNote" className="block font-medium mt-2">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="extraNote"
          className="w-full border border-gray-300 rounded px-3 py-2"
          rows={2}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="ระบุข้อมูลเพิ่มเติม เช่น มีร่องรอยฟกช้ำ / มีอาการทางจิตใจ"
        />
      </div>
    </div>
  )
}
