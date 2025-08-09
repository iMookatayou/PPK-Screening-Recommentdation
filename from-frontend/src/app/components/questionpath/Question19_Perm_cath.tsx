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
  routedBy: 'auto'
  type: string
}

interface Props {
  onResult: (result: Question19Result | null) => void
  type: string
}

export default function Question19_PermCath({ onResult, type }: Props) {
  const [note, setNote] = useState('')
  const prevKey = useRef<string>('')

  const todayName = getThaiDayName()

  useEffect(() => {
    const trimmedNote = note.trim()
    const symptoms: string[] = ['perm_cath_wound']
    if (trimmedNote) symptoms.push('custom_note')

    const finalNote = trimmedNote || 'ติดตามแผล Perm-Cath'
    const clinic = ['med']
    const isReferCase = true

    const resultKey = JSON.stringify({ finalNote, clinic, symptoms, isReferCase })

    if (prevKey.current !== resultKey) {
      prevKey.current = resultKey

      if (!trimmedNote && symptoms.length <= 1) {
        onResult(null)
        return
      }

      onResult({
        question: 'PermCathFollowup',
        question_code: 19,
        question_title: 'แผลจากการใส่ Perm-Cath',
        clinic,
        note: finalNote,
        symptoms,
        isReferCase,
        routedBy: 'auto',
        type,
      })
    }
  }, [note, onResult, type])

  return (
    <div className="flex flex-col gap-2 text-sm text-gray-800">
      <p className="text-gray-700 leading-relaxed">
        แผลจากการใส่สาย Perm-Cath สำหรับฟอกไต (ติดตามอาการ เช่น บวม แดง ติดเชื้อ)
      </p>

      <label htmlFor="note" className="block font-medium mt-2 mb-1">
        หมายเหตุเพิ่มเติม (ถ้ามี)
      </label>
      <textarea
        id="note"
        title="บันทึกหมายเหตุเพิ่มเติม"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows={2}
        placeholder="ระบุลักษณะแผล, ตำแหน่ง, อาการ ฯลฯ"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  )
}
