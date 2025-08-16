'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Select from 'react-select'

type Clinic = 'muang' | 'er'
type Option = { label: string; value: Clinic }

const clinicLabelMap = { muang: 'รพ.เมือง', er: 'ER' } as const

export interface AnimalBiteResult {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  type: string
}

export default function Question4_AnimalBite({
  onResult,
  type,
}: {
  onResult: (r: AnimalBiteResult | null) => void
  type: string
}) {
  const [animalType, setAnimalType] = useState('')
  const [customAnimal, setCustomAnimal] = useState('')
  const [customClinic, setCustomClinic] = useState<Option | null>({
    label: clinicLabelMap.muang,
    value: 'muang',
  })
  const [extraNote, setExtraNote] = useState('')

  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  const prevResultRef = useRef<string | null>(null)

  const otherClinicOptions: Option[] = [
    { value: 'muang', label: clinicLabelMap.muang },
    { value: 'er', label: clinicLabelMap.er },
  ]

  const result = useMemo<AnimalBiteResult | null>(() => {
    if (!animalType) return null

    let clinic: Clinic = 'muang'
    const isReferCase = false; 
    const noteParts: string[] = []
    const symptoms: string[] = ['animal_bite']
    let summary = animalType

    if (['งู', 'ตะขาบ', 'แมลงป่อง'].includes(animalType)) {
      clinic = 'er' // แค่เปลี่ยนห้องตรวจ → ไม่ถือ refer
      symptoms.push(
        animalType === 'งู'
          ? 'snake_bite'
          : animalType === 'ตะขาบ'
          ? 'centipede_bite'
          : 'scorpion_sting'
      )
      noteParts.push(animalType)
    } else if (['สุนัข', 'แมว', 'หนู'].includes(animalType)) {
      clinic = 'muang'
      symptoms.push(
        animalType === 'สุนัข'
          ? 'dog_bite'
          : animalType === 'แมว'
          ? 'cat_bite'
          : 'rat_bite'
      )
      noteParts.push(animalType)
    } else if (animalType === 'อื่นๆ') {
      const a = customAnimal.trim()
      if (!a) return null
      summary = a
      symptoms.push('other_animal')
      noteParts.push(a)
      clinic = customClinic?.value === 'er' ? 'er' : 'muang'
    }

    const extra = extraNote.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('animal_bite_note')
    }

    const finalNote = noteParts.join(' | ') || undefined

    return {
      question: 'AnimalBite',
      question_code: 4,
      question_title: 'สัตว์กัด/ต่อย',
      clinic: [clinic],
      note: finalNote,
      symptoms,
      isReferCase, // ← false เสมอ
      type,
      animalType,
      animalSummary: summary,
    }
  }, [animalType, customAnimal, customClinic, extraNote, type])

  useEffect(() => {
    const key = result ? JSON.stringify(result) : null
    if (prevResultRef.current !== key) {
      prevResultRef.current = key
      onResultRef.current(result)
    }
  }, [result])

  return (
    <div className="space-y-3 text-sm">
      <label htmlFor="animalSelect" className="text-gray-700 font-medium">
        โดนสัตว์กัด/แมลงกัดต่อย อาจต้องการวัคซีนหรือการรักษาเพิ่มเติม
      </label>

      <select
        id="animalSelect"
        value={animalType}
        onChange={(e) => setAnimalType(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      >
        <option value="">-- โปรดเลือกสัตว์ --</option>
        <option value="สุนัข">สุนัข</option>
        <option value="แมว">แมว</option>
        <option value="หนู">หนู</option>
        <option value="งู">งู</option>
        <option value="ตะขาบ">ตะขาบ</option>
        <option value="แมลงป่อง">แมลงป่อง</option>
        <option value="อื่นๆ">อื่นๆ (โปรดระบุ)</option>
      </select>

      {animalType === 'อื่นๆ' && (
        <div className="space-y-2">
          <div>
            <label className="text-gray-700 font-medium">ระบุชื่อสัตว์/เคสพิเศษ</label>
            <input
              type="text"
              value={customAnimal}
              onChange={(e) => setCustomAnimal(e.target.value)}
              placeholder="เช่น ค้างคาว, ลิง, ชะนี"
              className="w-full border rounded px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-gray-700 font-medium">เลือกห้องตรวจ</label>
            <Select<Option, false>
              options={[
                { value: 'muang', label: clinicLabelMap.muang },
                { value: 'er', label: clinicLabelMap.er },
              ]}
              placeholder="เลือกแผนก (ER หรือ รพ.เมือง)"
              value={customClinic}
              onChange={(v) => setCustomClinic(v)}
              isClearable
              className="text-sm mt-1"
            />
          </div>
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
          placeholder="ระบุหมายเหตุเพิ่มเติม เช่น บาดแผลลึก, เป็นแผลที่นิ้วมือ"
        />
      </div>
    </div>
  )
}
