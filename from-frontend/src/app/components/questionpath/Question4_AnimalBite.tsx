'use client'

import React, { useState } from 'react'
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
}

interface AnimalBiteProps {
  onResult: (result: AnimalBiteResult) => void
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

export default function Question4_AnimalBite({ onResult }: AnimalBiteProps) {
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

  const handleChange = (
    type: string,
    customAnimalText?: string,
    customClinicValue?: { label: string; value: string } | null,
    extraNoteText?: string
  ) => {
    const day = getThaiDayNumber()

    let clinic = 'muang'
    let isReferCase = false
    let note = ''
    let summary = type
    const symptoms: string[] = ['animal_bite']

    if (['งู', 'ตะขาบ', 'แมลงป่อง'].includes(type)) {
      clinic = 'er'
      isReferCase = true
      symptoms.push(type === 'งู' ? 'snake_bite' : type === 'ตะขาบ' ? 'centipede_bite' : 'scorpion_sting')
      note = `สัตว์ที่กัด/ต่อย: ${type}`
    } else if (['สุนัข', 'แมว', 'หนู'].includes(type)) {
      clinic = 'muang'
      isReferCase = false
      symptoms.push(type === 'สุนัข' ? 'dog_bite' : type === 'แมว' ? 'cat_bite' : 'rat_bite')
      note = `สัตว์ที่กัด/ต่อย: ${type}`
    } else if (type === 'อื่นๆ') {
      clinic = customClinicValue?.value || 'muang'
      isReferCase = false
      const animal = customAnimalText?.trim() || ''
      if (animal) {
        summary = `อื่นๆ: ${animal}`
        symptoms.push('other_animal')
        note = `สัตว์ที่กัด/ต่อย: ${animal}`
      }
    }

    if (extraNoteText && extraNoteText.trim()) {
      note += ` | หมายเหตุเพิ่มเติม: ${extraNoteText.trim()}`
    }

    onResult({
      question: 'AnimalBite',
      question_code: 4,
      question_title: 'สัตว์กัด/ต่อย',
      animalType: type,
      animalSummary: summary,
      isReferCase,
      clinic: [clinic],
      note: note || undefined,
      symptoms,
    })
  }

  return (
    <div className="space-y-3 text-sm">
      <label htmlFor="animalSelect" className="text-gray-700 font-medium">
        สัตว์ชนิดใดเป็นผู้กัด/ต่อยผู้ป่วย?
      </label>
      <select
        id="animalSelect"
        value={animalType}
        onChange={(e) => {
          const newType = e.target.value
          setAnimalType(newType)
          handleChange(newType, customAnimal, customClinic, extraNote)
        }}
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
              onChange={(e) => {
                const val = e.target.value
                setCustomAnimal(val)
                handleChange(animalType, val, customClinic, extraNote)
              }}
              placeholder="โปรดระบุ"
              className="w-full border rounded px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-gray-700 font-medium">เลือกห้องตรวจ</label>
            <Select
              options={clinicOptions}
              placeholder="ค้นหาและเลือกแผนก..."
              value={customClinic}
              onChange={(selected) => {
                setCustomClinic(selected)
                handleChange(animalType, customAnimal, selected, extraNote)
              }}
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
          onChange={(e) => {
            const val = e.target.value
            setExtraNote(val)
            handleChange(animalType, customAnimal, customClinic, val)
          }}
          placeholder="ระบุหมายเหตุเพิ่มเติม เช่น บาดแผลลึก, เป็นแผลที่นิ้วมือ"
        />
      </div>
    </div>
  )
}
