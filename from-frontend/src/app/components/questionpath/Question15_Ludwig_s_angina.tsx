'use client'

import React, { useEffect, useState } from 'react'
import { isAllowableKeloidDay, getThaiDayName } from '@/lib/dateUtils'
import ReusablePopup from '@/app/components/ui/ReusablePopup'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export interface Question16Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  isServiceAvailableToday: boolean
  symptoms: string[]
  isReferCase: boolean
}

type Props = {
  onResult: (data: Question16Result) => void
}

export default function Question16_Keloid({ onResult }: Props) {
  const [shownPopup, setShownPopup] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [extraNote, setExtraNote] = useState('')

  const allow = isAllowableKeloidDay()
  const thaiDay = getThaiDayName()

  useEffect(() => {
    const symptoms = ['keloid']
    if (!allow) symptoms.push('not_service_day')

    if (!allow && !shownPopup) {
      setPopupOpen(true)
      setShownPopup(true)
    }

    let baseNote = allow
      ? 'ตรวจติดตาม Keloid ตามวันให้บริการ'
      : `ไม่สามารถตรวจได้ในวัน${thaiDay} (นอกวันให้บริการ)`

    if (extraNote.trim()) {
      baseNote += ` | หมายเหตุ: ${extraNote.trim()}`
    }

    onResult({
      question: 'KeloidCheck',
      question_code: 16,
      question_title: 'ตรวจติดตาม Keloid (แผลเป็นนูน)',
      clinic: allow ? ['plastic'] : [],
      note: baseNote,
      isServiceAvailableToday: allow,
      symptoms,
      isReferCase: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allow, thaiDay, extraNote])

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

      <div className="mt-3">
        <label htmlFor="extraNote" className="block font-medium mb-1">
          หมายเหตุเพิ่มเติม (ถ้ามี):
        </label>
        <textarea
          id="extraNote"
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          rows={2}
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น สภาพแผลเป็นล่าสุด"
          className="w-full border border-gray-300 rounded px-3 py-2"
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
