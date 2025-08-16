'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Select from 'react-select'
import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'

export interface Question6Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  type: string
}

interface Question6Props {
  frontAgentGender?: '1' | '2' | '3'
  onResult: (result: Question6Result | null) => void
  type: string
}

type ClinicKey = 'surg' | 'muang' | 'uro'
type ClinicOption = { value: ClinicKey; label: string }

export default function Question6_UTI({
  frontAgentGender,
  onResult,
  type,
}: Question6Props) {
  // ---------- STATE ----------
  const [gender, setGender] = useState<'1' | '2' | '3' | null>(
    typeof frontAgentGender === 'string' ? frontAgentGender : null
  )
  const [hasProstateIssue, setHasProstateIssue] = useState(false)
  const [hasUrinaryRetention, setHasUrinaryRetention] = useState(false)
  const [customClinic, setCustomClinic] = useState<ClinicKey | null>(null)
  const [extraNote, setExtraNote] = useState('')

  // ---------- CALLBACK REFS ----------
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  const lastKeyRef = useRef<string>('__INIT__')

  // ---------- TIME LOGIC (URO เฉพาะ อ./พฤ. 08–12) ----------
  const now = new Date()
  const bkk = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  const thaiDay = bkk.getDay()
  const hour = bkk.getHours()
  const isTueThuMorning = (thaiDay === 2 || thaiDay === 4) && hour >= 8 && hour < 12

  // ---------- OPD OPTIONS ----------
  const clinicOptions: ClinicOption[] = [
    { value: 'surg', label: clinicLabelMap['surg'] },
    { value: 'muang', label: clinicLabelMap['muang'] },
    ...(isTueThuMorning ? [{ value: 'uro', label: clinicLabelMap['uro'] } as ClinicOption] : []),
  ]

  // ---------- DEFAULT CLINIC เมื่อ gender = '3' ----------
  useEffect(() => {
    if (gender === '3' && !customClinic) {
      setCustomClinic('surg')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, isTueThuMorning])

  const emitNullOnce = (tag: string) => {
    if (lastKeyRef.current !== tag) {
      lastKeyRef.current = tag
      onResultRef.current(null)
    }
  }

  // ---------- BUILD RESULT (ไม่บังคับติ๊ก checkbox สำหรับเพศชาย) ----------
  const result = useMemo<Question6Result | null>(() => {
    if (gender === null) return null

    const symptoms: string[] = ['uti']
    const noteParts: string[] = []
    let clinic: string[] = []

    if (gender === '1') {
      // ผู้ชาย: ไม่บังคับติ๊กอาการ
      if (hasProstateIssue) {
        symptoms.push('prostate_issue')
        noteParts.push('สงสัยต่อมลูกหมากโต')
      }
      if (hasUrinaryRetention) {
        symptoms.push('urinary_retention')
        noteParts.push('ปัสสาวะขัด/ไม่สุด')
      }
      clinic = isTueThuMorning ? ['uro'] : ['surg']
    } else if (gender === '2') {
      clinic = ['muang']
    } else if (gender === '3') {
      if (!customClinic) return null
      clinic = [customClinic]
    }

    const extra = extraNote.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('uti_note')
    }

    const note = noteParts.length ? noteParts.join(' | ') : undefined

    return {
      question: 'UTICase',
      question_code: 6,
      question_title: 'ทางเดินปัสสาวะ (UTI)',
      clinic,
      note,
      symptoms,
      type,
    }
  }, [gender, hasProstateIssue, hasUrinaryRetention, customClinic, extraNote, type, isTueThuMorning])

  // ---------- EMIT ----------
  useEffect(() => {
    if (gender === null) return emitNullOnce('WAIT_GENDER')
    if (gender === '3' && !customClinic) return emitNullOnce('WAIT_UNKNOWN_CLINIC')

    const key = result ? JSON.stringify(result) : 'NULL'
    if (lastKeyRef.current !== key) {
      lastKeyRef.current = key
      onResultRef.current(result)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, gender, customClinic])

  // ---------- HANDLERS ----------
  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value
    const v = (raw || null) as '1' | '2' | '3' | null

    if (v === null) {
      setGender(null)
      setCustomClinic(null)
      setHasProstateIssue(false)
      setHasUrinaryRetention(false)
      setExtraNote('')
      emitNullOnce('WAIT_GENDER')
      return
    }

    setGender(v)
    if (v !== '3') setCustomClinic(null)
  }

  return (
    <div className="space-y-4 text-sm">
      {/* เพศ */}
      <div>
        <label htmlFor="genderSelect" className="block font-medium text-gray-700 mb-1">
          เพศของผู้ป่วย
        </label>
        <select
          id="genderSelect"
          value={gender ?? ''}
          onChange={handleGenderChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">— เลือกเพศ —</option>
          <option value="1">ชาย</option>
          <option value="2">หญิง</option>
          <option value="3">ไม่ทราบแน่ชัด</option>
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

      {/* เลือกแผนก (เฉพาะเพศไม่ทราบแน่ชัด) */}
      {gender === '3' && (
        <div className="space-y-2">
          <label className="block font-medium text-gray-700 mb-1">
            เลือกแผนกที่ต้องการส่งต่อ
          </label>
          <Select<ClinicOption, false>
            isClearable
            options={clinicOptions}
            placeholder="ค้นหาและเลือกแผนก..."
            value={
              customClinic
                ? clinicOptions.find((opt) => opt.value === customClinic) || null
                : null
            }
            onChange={(selected) => setCustomClinic(selected ? selected.value : null)}
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
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ปวดแสบขัด / เป็นซ้ำ ฯลฯ"
        />
      </div>
    </div>
  )
}
