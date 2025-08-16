'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import ReusablePopup from '@/app/components/ui/popup/ReusablePopup'

export interface Question24Result {
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
  onResult: (result: Question24Result | null) => void
  type: string
}

export default function Question24_RetainedFB({ onResult, type }: Props) {
  const [extraNote, setExtraNote] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const prevKey = useRef<string>('')
  const shownOnceRef = useRef(false)

  useEffect(() => {
    const trimmed = extraNote.trim()
    const clinic = ['er']
    const isReferCase = true
    const symptoms = ['retained_foreign_body', ...(trimmed ? ['retain_note'] : [])]
    const note = trimmed || 'Retained foreign body (วัตถุชิ้นใหญ่/ปักคา)'

    if (!shownOnceRef.current) {
      setShowPopup(true)
      shownOnceRef.current = true
    }

    const key = JSON.stringify({ clinic, note, symptoms, isReferCase, type })
    if (prevKey.current !== key) {
      prevKey.current = key
      onResult({
        question: 'RetainedForeignBody',
        question_code: 24,
        question_title: 'Retained foreign body (วัตถุขนาดใหญ่ปักคาในร่างกาย)',
        clinic,
        note,
        symptoms,
        isReferCase,
        routedBy: 'auto',
        type,
      })
    }
  }, [extraNote, onResult, type])

  return (
    <div className="space-y-3 text-sm">
      {/* ตัวหนังสือแดงเตือนทันที */}
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="w-5 h-5" aria-hidden />
        <span>
          ผู้ป่วยมีวัตถุขนาดใหญ่ปักคาค้างในร่างกายมีความเสี่ยงต่อการฟ้องร้องหากให้รอตรวจ OPD
        </span>
      </div>

      <label htmlFor="extraNote" className="font-medium">
        หมายเหตุเพิ่มเติม (ถ้ามี)
      </label>
      <textarea
        id="extraNote"
        className="w-full border rounded px-3 py-2"
        rows={2}
        value={extraNote}
        onChange={(e) => setExtraNote(e.target.value)}
        placeholder="เช่น ตำแหน่ง/ชนิดวัตถุ มีเลือดออก บวม ปวด ฯลฯ"
      />

      {/* Popup เตือน */}
      <ReusablePopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        title="เคสนี้เสี่ยงต่อการฟ้องร้อง"
        message="ผู้ป่วยมีวัตถุขนาดใหญ่ปักคาค้างในร่างกายมีความเสี่ยงต่อการฟ้องร้องหากให้รอตรวจ OPD"
        icon={<AlertTriangle className="w-6 h-6" />}
        color="red"
        confirmText="รับทราบ"
      />
    </div>
  )
}
