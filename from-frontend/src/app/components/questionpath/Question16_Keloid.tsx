'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { isAllowableKeloidDay, getThaiDayName } from '@/lib/dateUtils'
import ReusablePopup from '@/app/components/ui/popup/ReusablePopup'
import { AlertTriangle } from 'lucide-react'

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

  // เตรียมผลลัพธ์เฉพาะวันให้บริการ
  const calculateResult = useCallback((): Question16Result => {
    const symptoms = ['keloid']
    let noteBase = 'ตรวจติดตาม Keloid ตามวันให้บริการ'
    if (extraNote.trim()) noteBase += ` | หมายเหตุ: ${extraNote.trim()}`
    return {
      question: 'KeloidCheck',
      question_code: 16,
      question_title: 'ตรวจติดตาม Keloid (แผลเป็นนูน)',
      clinic: ['plastic'],
      note: noteBase,
      symptoms,
      isReferCase: false,
      routedBy: 'auto',
      type,
    }
  }, [extraNote, type])

  // แสดง Popup ครั้งเดียวเมื่อ "ไม่ใช่วันให้บริการ"
  useEffect(() => {
    if (!allow && !shownPopup) {
      setPopupOpen(true)
      setShownPopup(true)
    }
  }, [allow, shownPopup])

  // อัปเดตผลลัพธ์ให้ parent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!allow) onResult(null)
      else onResult(calculateResult())
    }, 100)
    return () => clearTimeout(timer)
  }, [allow, calculateResult, onResult])

  // --- UI ---
  if (!allow) {
    return (
      <>
        {/* ข้อความเตือนซ้ำในฟอร์ม */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" aria-hidden />
            <span>
              วันนี้ไม่เปิดให้บริการตรวจ Keloid
              — เปิดเฉพาะวันจันทร์และพฤหัสบดี (วันนี้คือวัน{thaiDay})
            </span>
          </div>
          <div className="ml-7 text-gray-700">
            กรุณาแนะนำให้ผู้ป่วยมาตรวจในวันให้บริการ
          </div>
        </div>

        {/* Popup แจ้งเตือน */}
        <ReusablePopup
          isOpen={popupOpen}
          onClose={() => setPopupOpen(false)}
          title="วันนี้ไม่มีบริการตรวจ Keloid"
          message={`เปิดเฉพาะวันจันทร์และพฤหัสบดี (วันนี้คือวัน${thaiDay}) กรุณาแนะนำให้มาตรวจในวันให้บริการ`}
          icon={<AlertTriangle className="text-red-500 w-6 h-6 animate-pulse" />}
          confirmText="เข้าใจแล้ว"
          color="yellow"
        />
      </>
    )
  }

  // วันให้บริการ: แสดงข้อความยืนยัน + ช่องหมายเหตุ
  return (
    <div>
      <div className="text-green-700 font-medium flex items-center gap-2">
        วันนี้สามารถเข้ารับการตรวจ Keloid ได้
      </div>

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
    </div>
  )
}
