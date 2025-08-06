'use client'

import React, { useEffect, useState } from 'react'
import { getThaiDayNumber } from '@/lib/dateUtils'

export interface Question13Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
}

interface PsychCaseProps {
  onResult: (result: Question13Result) => void
}

export default function Question13_PsychCase({ onResult }: PsychCaseProps) {
  const [caseType, setCaseType] = useState<'' | 'new' | 'old'>('')
  const [hasPhysicalSymptom, setHasPhysicalSymptom] = useState(false)
  const [extraNote, setExtraNote] = useState('')

  useEffect(() => {
    if (!caseType) return

    let clinic: string[] = []
    let isReferCase = false
    let note = ''
    const symptoms: string[] = ['psych_case']

    if (caseType === 'new') {
      clinic = ['psych']
      note = 'New case: vital sign ปกติ, DTX ปกติ, ไม่มีอาการก้าวร้าว'
      symptoms.push('new_case', 'no_physical')
    } else if (caseType === 'old' && !hasPhysicalSymptom) {
      clinic = ['psych']
      note = 'Old case: ไม่มีภาวะผิดปกติทางกายร่วมด้วย'
      symptoms.push('old_case', 'no_physical')
    } else if (caseType === 'old' && hasPhysicalSymptom) {
      clinic = ['muang']
      isReferCase = true
      note =
        'Old case: มาด้วยอาการเจ็บป่วยทางกาย vital sign, DTX ปกติ (ส่งรพ.เมือง หรือห้องตรวจตามอาการสำคัญ)'
      symptoms.push('old_case', 'has_physical')
    }

    // รวมหมายเหตุเพิ่มเติมถ้ามี
    if (extraNote.trim()) {
      note += ` | ${extraNote.trim()}`
    }

    onResult({
      question: 'PsychCase',
      question_code: 13,
      question_title: 'ผู้ป่วยจิตเวช (ใหม่/เก่า)',
      clinic,
      note,
      symptoms,
      isReferCase,
    })
  }, [caseType, hasPhysicalSymptom, extraNote])

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
          <option value="new">
            New case (Vital sign, DTX ปกติ ไม่มีอาการก้าวร้าว)
          </option>
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
