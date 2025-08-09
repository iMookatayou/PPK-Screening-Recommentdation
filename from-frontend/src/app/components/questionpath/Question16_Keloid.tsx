'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { isAllowableKeloidDay, getThaiDayName } from '@/lib/dateUtils'
import ReusablePopup from '@/app/components/ui/ReusablePopup'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export interface Question16Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  routedBy: 'auto'
  type: string
}

type Props = {
  onResult: (data: Question16Result | null) => void
  type: string
}

export default function Question16_Keloid({ onResult, type }: Props) {
  const [shownPopup, setShownPopup] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [extraNote, setExtraNote] = useState('')

  const allow = isAllowableKeloidDay()
  const thaiDay = getThaiDayName()

  // Memoized logic for preparing the result
  const calculateResult = useCallback((): Question16Result => {
    const symptoms = ['keloid']
    if (!allow) symptoms.push('not_service_day')

    let noteBase = allow
      ? 'ตรวจติดตาม Keloid ตามวันให้บริการ'
      : `ไม่สามารถตรวจได้ในวัน${thaiDay} (นอกวันให้บริการ)`

    if (extraNote.trim()) {
      noteBase += ` | หมายเหตุ: ${extraNote.trim()}`
    }

    return {
      question: 'KeloidCheck',
      question_code: 16,
      question_title: 'ตรวจติดตาม Keloid (แผลเป็นนูน)',
      clinic: allow ? ['plastic'] : [],
      note: noteBase,
      symptoms,
      isReferCase: false,
      routedBy: 'auto',
      type,
    }
  }, [allow, thaiDay, extraNote, type])

  // Popup only shown once
  useEffect(() => {
    if (!allow && !shownPopup) {
      setPopupOpen(true)
      setShownPopup(true)
    }
  }, [allow, shownPopup])

  // Debounced onResult()
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = calculateResult()
      const isEmpty =
        result.clinic.length === 0 &&
        result.symptoms.length === 0 &&
        !result.note?.trim()

      onResult(isEmpty ? null : result)
    }, 100)

    return () => clearTimeout(timer)
  }, [calculateResult, onResult])

  return (
    <div>
      {allow ? (
        <div className="text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          วันนี้สามารถเข้ารับการตรวจ Keloid ได้
        </div>
      ) : (
        <div className="text-red-600 font-medium">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            วันนี้ไม่สามารถตรวจ Keloid ได้
          </div>
          <p className="text-sm text-gray-700 ml-6">
            เปิดเฉพาะวันจันทร์และพฤหัสบดีเท่านั้น (วันนี้คือวัน{thaiDay})
          </p>
        </div>
      )}

      <div className="mt-4">
        <label htmlFor="extraNote" className="block font-medium mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="extraNote"
          rows={2}
          className="w-full border px-3 py-2 rounded"
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น มีอาการบวมมากขึ้น"
          title="หมายเหตุเพิ่มเติม"
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
        />
      </div>

      <ReusablePopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        title="วันนี้ไม่มีบริการตรวจ Keloid"
        message="เปิดเฉพาะวันจันทร์และพฤหัสบดี กรุณาแนะนำมาตรวจในวันให้บริการ"
        icon={<AlertTriangle className="text-red-500 w-6 h-6 animate-pulse" />}
        confirmText="เข้าใจแล้ว"
        color="yellow"
      />
    </div>
  )
}
