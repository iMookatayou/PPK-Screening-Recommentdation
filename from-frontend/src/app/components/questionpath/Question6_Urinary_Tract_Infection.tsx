'use client'

import { useEffect, useRef, useState } from 'react'
import Select from 'react-select'
import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'

export interface Question6Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
}

interface Question6Props {
  frontAgentGender?: '1' | '2'
  onResult: (result: Question6Result | null) => void
}

export default function Question6_UTI({
  frontAgentGender = '1',
  onResult,
}: Question6Props) {
  const [gender, setGender] = useState<'1' | '2' | '3'>(frontAgentGender)
  const [hasProstateIssue, setHasProstateIssue] = useState(false)
  const [hasUrinaryRetention, setHasUrinaryRetention] = useState(false)
  const [customClinic, setCustomClinic] = useState<string | null>(null)
  const [extraNote, setExtraNote] = useState('')
  const prevKeyRef = useRef('')

  const clinicOptions = Object.entries(clinicLabelMap).map(([value, label]) => ({
    value,
    label,
  }))

  useEffect(() => {
    let clinic: string[] = []
    let isReferCase = false
    const symptoms: string[] = ['uti']
    const noteParts: string[] = []

    if (gender === '1') {
      clinic = ['uro']
      if (hasProstateIssue) {
        symptoms.push('prostate_issue')
        noteParts.push('สงสัยต่อมลูกหมากโต')
      }
      if (hasUrinaryRetention) {
        symptoms.push('urinary_retention')
        noteParts.push('ปัสสาวะขัดหรือไม่สุด')
      }
    } else if (gender === '2') {
      clinic = ['med']
    } else if (gender === '3') {
      if (!customClinic) {
        onResult(null)
        return
      }
      clinic = [customClinic]
      isReferCase = true
    }

    if (extraNote.trim()) {
      noteParts.push(extraNote.trim())
    }

    const finalNote = noteParts.length > 0 ? noteParts.join(' | ') : undefined
    const key = `${clinic.join(',')}|${symptoms.join(',')}|${finalNote}|${isReferCase}`

    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResult({
        question: 'UTICase',
        question_code: 6,
        question_title: 'ทางเดินปัสสาวะ (UTI)',
        clinic,
        note: finalNote,
        symptoms,
        isReferCase,
      })
    }
  }, [
    gender,
    hasProstateIssue,
    hasUrinaryRetention,
    customClinic,
    extraNote,
    onResult,
  ])

  return (
    <div className="space-y-4 text-sm">
      {/* เพศ */}
      <div>
        <label htmlFor="genderSelect" className="block font-medium text-gray-700 mb-1">
          เพศของผู้ป่วย
        </label>
        <select
          id="genderSelect"
          title="เลือกเพศของผู้ป่วย"
          value={gender}
          onChange={(e) => setGender(e.target.value as '1' | '2' | '3')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="1">ชาย</option>
          <option value="2">หญิง</option>
          <option value="3">ไม่ระบุ</option>
        </select>
      </div>

      {/* อาการเพิ่มเติม (เฉพาะเพศชาย) */}
      {gender === '1' && (
        <div className="space-y-2">
          <p className="text-gray-700 font-medium">อาการเพิ่มเติม</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={hasProstateIssue}
              onChange={(e) => setHasProstateIssue(e.target.checked)}
            />
            <span>สงสัยต่อมลูกหมากโต</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={hasUrinaryRetention}
              onChange={(e) => setHasUrinaryRetention(e.target.checked)}
            />
            <span>ปัสสาวะขัด / ปัสสาวะไม่สุด</span>
          </label>
        </div>
      )}

      {/* กรณีไม่ระบุเพศ → เลือกแผนก */}
      {gender === '3' && (
        <div className="space-y-2">
          <label className="block font-medium text-gray-700 mb-1">
            กรุณาเลือกแผนกที่ต้องการส่งต่อ
          </label>
          <Select
            options={clinicOptions}
            placeholder="ค้นหาและเลือกแผนก..."
            value={clinicOptions.find((c) => c.value === customClinic) || null}
            onChange={(selected) => setCustomClinic(selected?.value ?? null)}
            isClearable
            className="text-sm"
          />
        </div>
      )}

      {/* หมายเหตุเพิ่มเติม */}
      <div>
        <label htmlFor="extraNote" className="block font-medium text-gray-700 mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="extraNote"
          className="w-full border border-gray-300 rounded px-3 py-2"
          rows={2}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="ระบุรายละเอียด เช่น ปวดหน่วงมาก / ปัสสาวะแสบขัด ฯลฯ"
        />
      </div>
    </div>
  )
}
