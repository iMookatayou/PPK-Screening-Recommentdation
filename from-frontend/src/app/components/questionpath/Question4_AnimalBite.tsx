'use client'

import React, { useEffect, useState } from 'react'
import Select from 'react-select'
import { getThaiDayNumber } from '@/lib/dateUtils'

interface AnimalBiteResult {
  question: string
  question_code: number
  question_title: string
  animalType: string
  animalSummary: string
  isReferCase: boolean
  clinic: string[]
  note?: string
  symptoms: string[]
  type: string
}

interface AnimalBiteProps {
  onResult: (result: AnimalBiteResult | null) => void
  type: string
}

const clinicLabelMap: Record<string, string> = {
  surg: 'OPD ศัลย์',
  ortho: 'OPD Ortho',
  muang: 'รพ.เมือง',
  er: 'ER',
  ent: 'OPD ENT',
  uro: 'OPD URO ศัลย์',
  obgy: 'OPD นรีเวท',
  med: 'OPD MED',
  nite: 'นิติเวช',
  lr: 'LR',
  anc: 'OPD ANC',
  psych: 'OPD จิตเวช',
  opd203: 'OPD 203',
  dental: 'OPD ทันตกรรม',
  plastic: 'OPD ศัลย์ตกแต่ง',
  occmed: 'อาชีวเวชกรรม',
}

export default function Question4_AnimalBite({ onResult, type }: AnimalBiteProps) {
  const [animalType, setAnimalType] = useState('')
  const [customAnimal, setCustomAnimal] = useState('')
  const [customClinic, setCustomClinic] = useState<{ label: string; value: string } | null>({
    label: clinicLabelMap['muang'],
    value: 'muang',
  })
  const [extraNote, setExtraNote] = useState('')

  const clinicOptions = Object.entries(clinicLabelMap).map(([key, label]) => ({
    value: key,
    label,
  }))

  useEffect(() => {
    if (!animalType || animalType === '') {
      onResult(null)
      return
    }

    const day = getThaiDayNumber()

    let clinic = 'muang'
    let isReferCase = false
    let note = ''
    let summary = animalType
    const symptoms: string[] = ['animal_bite']

    if (['งู', 'ตะขาบ', 'แมลงป่อง'].includes(animalType)) {
      clinic = 'er'
      isReferCase = true
      symptoms.push(
        animalType === 'งู'
          ? 'snake_bite'
          : animalType === 'ตะขาบ'
          ? 'centipede_bite'
          : 'scorpion_sting'
      )
      note = `สัตว์ที่กัด/ต่อย: ${animalType}`
    } else if (['สุนัข', 'แมว', 'หนู'].includes(animalType)) {
      clinic = 'muang'
      isReferCase = false
      symptoms.push(
        animalType === 'สุนัข'
          ? 'dog_bite'
          : animalType === 'แมว'
          ? 'cat_bite'
          : 'rat_bite'
      )
      note = `สัตว์ที่กัด/ต่อย: ${animalType}`
    } else if (animalType === 'อื่นๆ') {
      const animal = customAnimal.trim()
      clinic = customClinic?.value || 'muang'
      isReferCase = false
      if (animal) {
        summary = `อื่นๆ: ${animal}`
        symptoms.push('other_animal')
        note = `สัตว์ที่กัด/ต่อย: ${animal}`
      } else {
        onResult(null)
        return
      }
    }

    if (extraNote.trim()) {
      note += ` | หมายเหตุเพิ่มเติม: ${extraNote.trim()}`
    }

    onResult({
      question: 'AnimalBite',
      question_code: 4,
      question_title: 'สัตว์กัด/ต่อย',
      animalType,
      animalSummary: summary,
      isReferCase,
      clinic: [clinic],
      note: note || undefined,
      symptoms,
      type,
    })
  }, [animalType, customAnimal, customClinic, extraNote, type])

  return (
    <div className="space-y-3 text-sm">
      <label htmlFor="animalSelect" className="text-gray-700 font-medium">
        โดนสัตว์กกัดหรือแมลงกัดต่อย อาจต้องการวัคซีนหรือการรักษาเพิ่มเติม
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
              placeholder="โปรดระบุ"
              className="w-full border rounded px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-gray-700 font-medium">เลือกห้องตรวจ</label>
            <Select
              options={[
                { value: 'muang', label: clinicLabelMap['muang'] },
                { value: 'er', label: clinicLabelMap['er'] },
              ]}
              placeholder="ค้นหาและเลือกแผนก..."
              value={customClinic}
              onChange={(selected) => setCustomClinic(selected)}
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
