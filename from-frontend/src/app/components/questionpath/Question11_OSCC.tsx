'use client'

import { useEffect, useRef, useState } from 'react'

interface Question11Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
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

  // กันลูปจาก onResult reference เปลี่ยน
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const prevKeyRef = useRef('__INIT__')

  useEffect(() => {
    // ยังไม่เลือกอาการ -> ส่ง null ครั้งเดียว
    if (!injuryStatus) {
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    // route ห้องตรวจตามอาการ
    let clinic = ''
    const symptoms: string[] = ['oscc_case']
    const noteParts: string[] = []

    if (injuryStatus === 'hasInjury') {
      clinic = 'er'
      symptoms.push('injury')
      noteParts.push('มีการบาดเจ็บต่อร่างกาย หรือมีบาดแผล')
    } else {
      clinic = 'nite'
      symptoms.push('no_injury')
      noteParts.push('ไม่มีการบาดเจ็บต่อร่างกาย')
    }

    const extra = extraNote.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('oscc_note')
    }

    const note = noteParts.join(' | ')
    const payload: Question11Result = {
      question: 'OSCC',
      question_code: 11,
      question_title: 'ผู้ป่วย OSCC (ความรุนแรงทางร่างกาย/จิตใจ)',
      clinic: [clinic],
      note,
      symptoms,
      routedBy: 'auto',
      type,
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [injuryStatus, extraNote, type])

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
