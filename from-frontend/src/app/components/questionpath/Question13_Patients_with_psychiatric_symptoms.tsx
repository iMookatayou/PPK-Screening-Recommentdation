'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface Question13Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  type: string
  // isReferCase: ไม่มีช้อย refer → ไม่ต้องส่ง
  // isReferCase?: boolean
}

interface PsychCaseProps {
  onResult: (result: Question13Result | null) => void
  type: string
}

export default function Question13_PsychCase({ onResult, type }: PsychCaseProps) {
  const [caseType, setCaseType] = useState<'' | 'new' | 'old'>('')
  const [hasPhysicalSymptom, setHasPhysicalSymptom] = useState(false)
  const [extraNote, setExtraNote] = useState('')

  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const prevKeyRef = useRef<string>('__INIT__')

  useEffect(() => {
    // ยังไม่เลือกประเภท → ส่ง null ครั้งเดียว
    if (!caseType) {
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    // ===== สร้าง payload =====
    let clinic: string[] = []
    const symptoms: string[] = ['psych_case']
    const noteParts: string[] = []

    if (caseType === 'new') {
      clinic = ['psych']
      noteParts.push('New case: vital sign ปกติ, DTX ปกติ, ไม่มีอาการก้าวร้าว')
      symptoms.push('new_case', 'no_physical')
    } else {
      // old case
      if (hasPhysicalSymptom) {
        clinic = ['muang']
        noteParts.push('Old case: มาด้วยอาการเจ็บป่วยทางกาย vital sign, DTX ปกติ (ส่งรพ.เมือง หรือห้องตรวจตามอาการสำคัญ)')
        symptoms.push('old_case', 'has_physical')
      } else {
        clinic = ['psych']
        noteParts.push('Old case: ไม่มีภาวะผิดปกติทางกายร่วมด้วย')
        symptoms.push('old_case', 'no_physical')
      }
    }

    const extra = extraNote.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('psych_note')
    }

    const note = noteParts.join(' | ') || undefined

    const payload: Question13Result = {
      question: 'PsychCase',
      question_code: 13,
      question_title: 'ผู้ป่วยจิตเวช (ใหม่/เก่า)',
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
  }, [caseType, hasPhysicalSymptom, extraNote, type])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label htmlFor="psych-case-type" className="block font-medium">
          ประเภทผู้ป่วยจิตเวช:
        </label>
        <select
          id="psych-case-type"
          title="เลือกประเภทผู้ป่วยจิตเวช"
          value={caseType}
          onChange={(e) => setCaseType(e.target.value as 'new' | 'old' | '')}
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">-- เลือกประเภท --</option>
          <option value="new">New case (Vital sign, DTX ปกติ ไม่มีอาการก้าวร้าว)</option>
          <option value="old">Old case</option>
        </select>
      </div>

      {caseType === 'old' && (
        <div>
          <label htmlFor="physical-symptom" className="block font-medium">
            มีอาการทางกายร่วม เช่น เจ็บป่วยทางกายหรือไม่?
          </label>
          <select
            id="physical-symptom"
            title="เลือกว่ามีอาการทางกายร่วมหรือไม่"
            value={hasPhysicalSymptom ? 'yes' : 'no'}
            onChange={(e) => setHasPhysicalSymptom(e.target.value === 'yes')}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="no">ไม่มี</option>
            <option value="yes">มี</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor="extraNote" className="block font-medium mt-2">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="extraNote"
          className="w-full border px-3 py-2 rounded"
          rows={2}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น มีอาการซึม, กังวล, ปวดหัว"
        />
      </div>
    </div>
  )
}
