'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface Question9Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string                 // <- ส่ง note เสมอ
  symptoms: string[]
  isReferCase: boolean
  type: string
}

interface Question9Props {
  onResult: (result: Question9Result | null) => void
  type: string
}

export default function Question9_Case_Refer_MED({ onResult, type }: Question9Props) {
  // --- form state ---
  const [visitType, setVisitType] = useState<'within3m' | 'over3m' | ''>('') // ต้องเลือกก่อน
  const [hasRelatedSymptoms, setHasRelatedSymptoms] = useState<boolean | null>(null)
  const [isReferCase, setIsReferCase] = useState(false)
  const [followupDuration, setFollowupDuration] = useState('') // ใช้ได้ทั้ง refer/non-refer
  const [noteExtra, setNoteExtra] = useState('')
  const [touched, setTouched] = useState(false)

  // --- stable onResult to avoid loop ---
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  // --- compute result only when form complete ---
  const computed = useMemo(() => {
    if (!touched) return { key: 'INIT', result: null as Question9Result | null }

    // ต้องเลือก 2 อย่างก่อน: visitType + related/unrelated
    if (!visitType || hasRelatedSymptoms === null) {
      const k = `WAIT|visitType=${visitType}|related=${hasRelatedSymptoms}`
      return { key: k, result: null as Question9Result | null }
    }

    // clinic: refer -> เมือง, ไม่ refer -> MED
    const clinic = isReferCase ? ['muang'] : ['med']

    // symptoms
    const symptoms: string[] = ['refer_med_check']
    if (visitType === 'within3m') symptoms.push('followup_within_3m')
    else symptoms.push('followup_over_3m')

    if (hasRelatedSymptoms) symptoms.push('related_symptoms')
    else symptoms.push('unrelated_symptoms')

    if (isReferCase) symptoms.push('manual_refer')

    // note
    const noteParts: string[] = []
    noteParts.push(visitType === 'within3m' ? 'มาตามนัดภายใน 3 เดือน' : 'มาหลังนัดเกิน 3 เดือน')
    noteParts.push(hasRelatedSymptoms ? 'อาการเกี่ยวข้องกับโรคเดิม' : 'อาการไม่เกี่ยวข้องกับโรคเดิม')
    if (isReferCase) noteParts.push('เคส Refer ที่ไม่ได้ส่งตามระบบ')
    if (followupDuration.trim()) noteParts.push(`ระยะเวลาตามนัด: ${followupDuration.trim()}`)
    if (noteExtra.trim()) {
      noteParts.push(`${noteExtra.trim()}`)
      // ใช้มาตรฐานเดียวกัน: มีหมายเหตุ → ใส่ oscc_note
      if (!symptoms.includes('med_note')) symptoms.push('med_note')
    }

    const note = noteParts.join(' | ') // <- ส่ง note เสมอ

    const result: Question9Result = {
      question: 'CaseReferMed',
      question_code: 9,
      question_title: 'ผู้ป่วยนัด/ส่งต่อ แผนกอายุรกรรม',
      clinic,
      note,
      symptoms,
      isReferCase,
      type,
    }

    const key = JSON.stringify({
      visitType, hasRelatedSymptoms, isReferCase, followupDuration, noteExtra, clinic, note, symptoms, type
    })
    return { key, result }
  }, [touched, visitType, hasRelatedSymptoms, isReferCase, followupDuration, noteExtra, type])

  // --- emit only when key changed ---
  const prevKeyRef = useRef('')
  useEffect(() => {
    if (prevKeyRef.current !== computed.key) {
      prevKeyRef.current = computed.key
      onResultRef.current(computed.result)
    }
  }, [computed])

  return (
    <div className="space-y-4 text-sm">
      {/* 1) เลือกภายใน/เกินนัด — แสดงเสมอ */}
      <label htmlFor="visitType" className="block font-medium text-gray-800">
        ผู้ป่วยมาตามนัดหรือไม่?
      </label>
      <select
        id="visitType"
        aria-label="ผู้ป่วยมาตามนัดหรือไม่"
        value={visitType}
        onChange={(e) => {
          setVisitType(e.target.value as 'within3m' | 'over3m' | '')
          setTouched(true)
        }}
        className="w-full border px-3 py-2 rounded"
      >
        <option value="">-- โปรดเลือก --</option>
        <option value="within3m">มาตามนัด / ภายใน 3 เดือน</option>
        <option value="over3m">มาหลังนัดเกิน 3 เดือน</option>
      </select>

      {/* 2) เลือกเกี่ยวข้อง/ไม่เกี่ยวข้อง — แสดงเสมอ */}
      <div>
        <label className="block font-medium text-gray-800">
          อาการที่มาเกี่ยวข้องกับโรคเดิมหรือไม่?
        </label>
        <div className="flex items-center gap-4 mt-1">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="relatedSymptoms"
              checked={hasRelatedSymptoms === true}
              onChange={() => { setHasRelatedSymptoms(true); setTouched(true) }}
              className="mr-2"
            />
            เกี่ยวข้อง
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="relatedSymptoms"
              checked={hasRelatedSymptoms === false}
              onChange={() => { setHasRelatedSymptoms(false); setTouched(true) }}
              className="mr-2"
            />
            ไม่เกี่ยวข้อง
          </label>
        </div>
      </div>

      {/* 3) ติ๊ก Refer ได้ตอนไหนก็ได้ — ไม่ซ่อน select ใด ๆ */}
      <div>
        <label className="inline-flex items-center mt-2">
          <input
            type="checkbox"
            checked={isReferCase}
            onChange={(e) => { setIsReferCase(e.target.checked); setTouched(true) }}
            className="mr-2"
          />
          Case Refer ที่ไม่ได้ส่งตามระบบ
        </label>
      </div>

      {/* 4) ระยะเวลาตามนัด (กรอกเมื่อทราบ) */}
      <div>
        <label htmlFor="duration" className="block mt-2 font-medium text-gray-800">
          ระบุระยะเวลาตามนัด (เช่น 5 วัน / 3 เดือน / 1 ปี):
        </label>
        <input
          id="duration"
          aria-label="ระยะเวลาตามนัด"
          type="text"
          value={followupDuration}
          onChange={(e) => { setFollowupDuration(e.target.value); setTouched(true) }}
          className="w-full border px-3 py-2 rounded"
          placeholder="เช่น 3 เดือน หรือ 2 สัปดาห์"
        />
      </div>

      {/* 5) หมายเหตุเพิ่มเติม */}
      <div>
        <label htmlFor="noteExtra" className="block font-medium text-gray-800 mt-2">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="noteExtra"
          value={noteExtra}
          onChange={(e) => { setNoteExtra(e.target.value); setTouched(true) }}
          rows={2}
          className="w-full border px-3 py-2 rounded"
          placeholder="ใส่รายละเอียดเพิ่มเติม เช่น มีผล lab ล่าสุด"
        />
      </div>
    </div>
  )
}
