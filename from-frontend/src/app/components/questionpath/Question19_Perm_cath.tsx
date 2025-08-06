'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getThaiDayName } from '@/lib/dateUtils'

export interface Question19Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
}

interface Props {
  onResult: (result: Question19Result) => void
}

export default function Question19_PermCath({ onResult }: Props) {
  const [note, setNote] = useState('')
  const hasSentInitial = useRef(false)
  const todayName = getThaiDayName()

  const baseResult = {
    question: 'PermCathFollowup',
    question_code: 19,
    question_title: 'แผลจากการใส่ Perm-Cath',
    clinic: ['med'],
    isReferCase: false,
  }

  const emitResult = (text: string) => {
    const trimmedNote = text.trim()
    const symptoms: string[] = ['perm_cath_wound']

    const finalNote = trimmedNote || 'ติดตามแผล Perm-Cath'
    onResult({
      ...baseResult,
      note: finalNote,
      symptoms,
    })
  }

  useEffect(() => {
    if (!hasSentInitial.current) {
      emitResult(note)
      hasSentInitial.current = true
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNote(value)
    emitResult(value)
  }

  return (
    <div className="flex flex-col gap-2 text-sm text-gray-800">
      <p className="text-gray-700 leading-relaxed">
        แผลที่เกิดจากการผ่าตัดเส้นเลือดเพื่อทำการล้างไต (AVF - arteriovenous fistula)
      </p>

      <label htmlFor="note" className="block font-medium mt-2 mb-1">
        หมายเหตุเพิ่มเติม (ถ้ามี):
      </label>
      <textarea
        id="note"
        title="บันทึกหมายเหตุเพิ่มเติม"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows={2}
        placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น ลักษณะแผล, เคยมีอาการมาก่อน ฯลฯ"
        value={note}
        onChange={handleChange}
      />
    </div>
  )
}
