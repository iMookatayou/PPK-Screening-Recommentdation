'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface Question15Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  type: string
}

interface Question15Props {
  onResult: (result: Question15Result | null) => void
  type: string
}

export default function Question15_LudwigAngina({ onResult, type }: Question15Props) {
  const [hasAirwayProblem, setHasAirwayProblem] = useState<'yes' | 'no' | ''>('')
  const [selectedClinic, setSelectedClinic] = useState<'ent' | 'dental' | ''>('')
  const [extraNote, setExtraNote] = useState('')

  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const prevKeyRef = useRef<string>('__INIT__')

  useEffect(() => {
    // ยังไม่เลือก airway → ส่ง null ครั้งเดียว
    if (!hasAirwayProblem) {
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    const symptoms: string[] = ['ludwig_angina']
    const noteParts: string[] = []
    let clinic: string[] = []

    if (hasAirwayProblem === 'yes') {
      clinic = ['er'] // มี Upper airway obstruction → ER
      noteParts.push('มีปัญหา Upper airway obstruction')
      symptoms.push('airway_problem')
    } else {
      // ไม่มีปัญหา → ต้องเลือกห้องตรวจ
      if (!selectedClinic) {
        if (prevKeyRef.current !== 'WAIT_CLINIC') {
          prevKeyRef.current = 'WAIT_CLINIC'
          onResultRef.current(null)
        }
        return
      }
      clinic = [selectedClinic] // 'ent' หรือ 'dental'
      noteParts.push('ไม่มีปัญหา Upper airway obstruction')
      symptoms.push('no_airway_problem')
    }

    const extra = extraNote.trim()
    if (extra) {
      noteParts.push(extra)
      if (!symptoms.includes('ludwig_note')) symptoms.push('ludwig_note')
    }

    const note = noteParts.join(' | ') || undefined

    const payload: Question15Result = {
      question: 'Ludwig’s angina',
      question_code: 15,
      question_title: 'Ludwig’s angina (เจ็บกราม อ้าปากไม่ขึ้น คางบวม)',
      clinic,
      note,
      symptoms,
      type,
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [hasAirwayProblem, selectedClinic, extraNote, type])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label htmlFor="airway-problem" className="block font-medium">
          ปัญหา Upper airway obstruction
        </label>
        <select
          id="airway-problem"
          value={hasAirwayProblem}
          onChange={(e) => {
            const v = e.target.value as 'yes' | 'no' | ''
            setHasAirwayProblem(v)
            if (v === 'yes') setSelectedClinic('') // เคลียร์ตัวเลือกห้องตรวจเมื่อเข้า ER
          }}
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">-- เลือก --</option>
          <option value="yes">มีปัญหา</option>
          <option value="no">ไม่มีปัญหา</option>
        </select>
      </div>

      {hasAirwayProblem === 'no' && (
        <div>
          <label htmlFor="clinic-select" className="block font-medium">
            เลือกห้องตรวจ
          </label>
          <select
            id="clinic-select"
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value as 'ent' | 'dental' | '')}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">-- เลือกห้องตรวจ --</option>
            <option value="ent">OPD ENT</option>
            <option value="dental">OPD ทันตกรรม</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor="extraNote" className="block font-medium">
          หมายเหตุเพิ่มเติม
        </label>
        <textarea
          id="extraNote"
          className="w-full border px-3 py-2 rounded"
          rows={2}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="เช่น อาการบวมมาก เจ็บมาก"
        />
      </div>
    </div>
  )
}
