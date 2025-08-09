'use client'

import { useEffect, useRef, useState } from 'react'

export interface Question9Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
  type: string
}

interface Question9Props {
  onResult: (result: Question9Result | null) => void
  type: string
}

export default function Question9_Case_Refer_MED({ onResult, type }: Question9Props) {
  const [visitType, setVisitType] = useState<'within3m' | 'over3m' | ''>('')
  const [hasRelatedSymptoms, setHasRelatedSymptoms] = useState<boolean | null>(null)
  const [isReferCase, setIsReferCase] = useState(false)
  const [followupDuration, setFollowupDuration] = useState<string>('')
  const [noteExtra, setNoteExtra] = useState<string>('')
  const [hasTouched, setHasTouched] = useState(false)

  const prevKeyRef = useRef('')

  useEffect(() => {
    if (!hasTouched) return

    const symptoms: string[] = ['refer_med_check']
    const noteParts: string[] = []
    let clinic: string[] = []

    if (isReferCase) {
      clinic = ['muang']
      symptoms.push('manual_refer')
      noteParts.push('เป็นเคส Refer ที่ไม่ได้ส่งตามระบบ')
    } else {
      if (!visitType || hasRelatedSymptoms === null) {
        onResult(null)
        return
      }

      clinic = ['med']
      if (visitType === 'within3m') {
        noteParts.push('มาตามนัดภายใน 3 เดือน')
        symptoms.push('followup_within_3m')

        if (hasRelatedSymptoms) {
          noteParts.push('อาการเกี่ยวข้องกับโรคเดิม')
          symptoms.push('related_symptoms')
        } else {
          noteParts.push('อาการไม่เกี่ยวข้องกับโรคเดิม')
          symptoms.push('unrelated_symptoms')
        }
      } else if (visitType === 'over3m') {
        noteParts.push('มาหลังนัดเกิน 3 เดือน')
        symptoms.push('followup_over_3m')

        if (hasRelatedSymptoms) {
          noteParts.push('อาการเกี่ยวข้องกับโรคเดิม')
        } else {
          noteParts.push('อาการไม่เกี่ยวข้องกับโรคเดิม')
          symptoms.push('unrelated_symptoms')
        }
      }
    }

    if (followupDuration.trim()) {
      noteParts.push(`ระยะเวลาตามนัด: ${followupDuration.trim()}`)
    }

    if (noteExtra.trim()) {
      noteParts.push(noteExtra.trim())
    }

    const note = noteParts.join(' | ')
    const key = `${clinic.join()}-${visitType}-${hasRelatedSymptoms}-${isReferCase}-${followupDuration}-${noteExtra}`

    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResult({
        question: 'CaseReferMed',
        question_code: 9,
        question_title: 'ผู้ป่วยนัด/ส่งต่อ แผนกอายุรกรรม',
        clinic,
        note,
        symptoms,
        isReferCase,
        type,
      })
    }
  }, [visitType, hasRelatedSymptoms, isReferCase, followupDuration, noteExtra, hasTouched, type])

  return (
    <div className="space-y-4 text-sm">
      <label className="block font-medium text-gray-800">ผู้ป่วยมาตามนัดหรือไม่?</label>
      <select
        value={visitType}
        onChange={(e) => {
          setVisitType(e.target.value as 'within3m' | 'over3m' | '')
          setHasTouched(true)
        }}
        className="w-full border px-3 py-2 rounded"
        title="เลือกประเภทการมาตามนัด"
      >
        <option value="">-- โปรดเลือก --</option>
        <option value="within3m">มาตามนัด / ภายใน 3 เดือน</option>
        <option value="over3m">มาหลังนัดเกิน 3 เดือน</option>
      </select>

      {visitType && (
        <div>
          <label className="block font-medium text-gray-800">
            อาการที่มาเกี่ยวข้องกับโรคเดิมหรือไม่?
          </label>
          <div className="flex items-center gap-4 mt-1">
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={hasRelatedSymptoms === true}
                onChange={() => {
                  setHasRelatedSymptoms(true)
                  setHasTouched(true)
                }}
                className="mr-2"
              />
              เกี่ยวข้อง
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={hasRelatedSymptoms === false}
                onChange={() => {
                  setHasRelatedSymptoms(false)
                  setHasTouched(true)
                }}
                className="mr-2"
              />
              ไม่เกี่ยวข้อง
            </label>
          </div>
        </div>
      )}

      {visitType && (
        <div>
          <label htmlFor="duration" className="block mt-2 font-medium text-gray-800">
            ระบุระยะเวลาตามนัด (เช่น 5 วัน / 3 เดือน / 1 ปี):
          </label>
          <input
            type="text"
            id="duration"
            value={followupDuration}
            onChange={(e) => {
              setFollowupDuration(e.target.value)
              setHasTouched(true)
            }}
            className="w-full border px-3 py-2 rounded"
            placeholder="เช่น 3 เดือน หรือ 2 สัปดาห์"
            title="ระยะเวลาตามนัด"
          />
        </div>
      )}

      <div>
        <label className="inline-flex items-center mt-2">
          <input
            type="checkbox"
            checked={isReferCase}
            onChange={(e) => {
              setIsReferCase(e.target.checked)
              setHasTouched(true)
            }}
            className="mr-2"
          />
          เป็นเคส Refer ที่ไม่ได้ส่งตามระบบ
        </label>
      </div>

      <div>
        <label htmlFor="noteExtra" className="block font-medium text-gray-800 mt-2">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="noteExtra"
          value={noteExtra}
          onChange={(e) => {
            setNoteExtra(e.target.value)
            setHasTouched(true)
          }}
          rows={2}
          className="w-full border px-3 py-2 rounded"
          placeholder="ใส่รายละเอียดเพิ่มเติม เช่น มีผล lab ล่าสุด"
          title="หมายเหตุเพิ่มเติม"
        />
      </div>
    </div>
  )
}
