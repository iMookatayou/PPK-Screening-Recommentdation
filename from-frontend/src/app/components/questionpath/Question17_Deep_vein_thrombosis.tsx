'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface Question17Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
  routedBy: 'auto'
  type: string
}

interface Props {
  onResult: (data: Question17Result | null) => void
  type: string
}

type DvtSymKey =
  | 'uni_swelling'   // ขาข้างเดียวบวม
  | 'calf_tender'    // เจ็บบริเวณน่อง
  | 'claudication'   // ปวดขาเวลาเดิน
  | 'red_warm'       // ขาแดง ร้อน
  | 'ankle_swelling' // ข้อเท้าบวม

const OPTION_LIST: { key: DvtSymKey; label: string }[] = [
  { key: 'uni_swelling',   label: 'ขาข้างเดียวบวม' },
  { key: 'calf_tender',    label: 'เจ็บบริเวณน่อง' },
  { key: 'claudication',   label: 'ปวดขาเวลาเดิน' },
  { key: 'red_warm',       label: 'ขาแดง ร้อน' },
  { key: 'ankle_swelling', label: 'ข้อเท้าบวม' },
]

export default function Question17_DVT({ onResult, type }: Props) {
  const [selected, setSelected] = useState<DvtSymKey[]>([])
  const [customNote, setCustomNote] = useState('')

  // ทำ onResult ให้เสถียร
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  // กันยิงซ้ำ
  const prevKeyRef = useRef<string>('__INIT__')

  const toggle = (k: DvtSymKey) =>
    setSelected(prev =>
      prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
    )

  useEffect(() => {
    const extra = customNote.trim()

    // ยังไม่เลือกอะไรและไม่มี note → ส่ง null แค่ครั้งเดียว
    if (selected.length === 0 && !extra) {
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    // symptoms tags
    const symptoms: string[] = ['dvt', ...selected.map(k => `dvt_${k}`)]
    if (extra) symptoms.push('dvt_note')

    // note: รวม label ที่เลือก + extra
    const labelsChosen = OPTION_LIST
      .filter(opt => selected.includes(opt.key))
      .map(opt => opt.label)

    const noteParts = [...labelsChosen]
    if (extra) noteParts.push(extra)
    const finalNote =
      noteParts.length > 0 ? noteParts.join(' | ') : 'สงสัย DVT (ไม่ระบุอาการ)'

    // routing: ตามเกณฑ์งานทั่วไป → รพ.เมือง
    const clinic = ['muang']

    const payload: Question17Result = {
      question: 'DVTSuspect',
      question_code: 17,
      question_title: 'ภาวะสงสัยหลอดเลือดดำลึกอุดตัน (DVT)',
      clinic,
      note: finalNote,
      symptoms,
      isReferCase: false,    
      routedBy: 'auto',
      type,
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [selected, customNote, type])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-2 font-medium">โปรดเลือกอาการที่เกี่ยวข้องกับภาวะ DVT:</p>

        <div className="space-y-2 mb-3">
          {OPTION_LIST.map(opt => (
            <label key={opt.key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selected.includes(opt.key)}
                onChange={() => toggle(opt.key)}
                className="w-4 h-4 border-gray-300 rounded"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        <label htmlFor="customNote" className="block font-medium mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="customNote"
          title="หมายเหตุเพิ่มเติม"
          rows={2}
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder="เช่น ปวดขาขวา 3 วัน, เคยเป็นมาก่อน ฯลฯ"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
    </div>
  )
}
