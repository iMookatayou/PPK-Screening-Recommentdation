'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface Question10Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note: string
  symptoms: string[]
  isReferCase: boolean
  type: string
}

interface Question10Props {
  onResult: (result: Question10Result | null) => void
  type: string
}

export default function Question10_Injury({ onResult, type }: Question10Props) {
  const [choice, setChoice] = useState<'' | 'stable' | 'treated'>('')
  const [hasCaseDoc, setHasCaseDoc] = useState<boolean | null>(null)
  const [isReferCase, setIsReferCase] = useState(false) // << ใช้งานจริงแล้ว
  const [noteExtra, setNoteExtra] = useState('')

  // ทำ onResult ให้เสถียร
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const computed = useMemo(() => {
    // ยังไม่ครบ ต้องเลือก choice + hasCaseDoc ก่อน
    if (!choice || hasCaseDoc === null) {
      return { key: `WAIT|${choice}|${hasCaseDoc}`, result: null as Question10Result | null }
    }

    const symptoms: string[] = ['injury', 'no_injury'] // ตามที่คอมเมนต์บอกให้ส่งทั้งคู่
    const noteParts: string[] = []

    if (choice === 'stable') {
      symptoms.push('stable')
      noteParts.push('Vital sign stable ไม่มีบาดแผล')
    } else {
      symptoms.push('treated')
      noteParts.push('ได้รับการรักษาแล้ว หรือไม่มีการบาดเจ็บรุนแรง เช่น แผลฉีกขาด หรือกระดูกหัก')
    }

    if (hasCaseDoc) {
      symptoms.push('has_case_doc')
      noteParts.push('มีใบคดี')
    } else {
      symptoms.push('no_case_doc')
      noteParts.push('ไม่มีใบคดี')
    }

    // Case refer
    if (isReferCase) {
      symptoms.push('manual_refer')
      noteParts.push('เคส Refer ที่ไม่ได้ส่งตามระบบ')
    }

    const extra = noteExtra.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('injury_note') // เดิม oscc_note → ปรับให้สอดคล้องแบบฟอร์มนี้
    }

    const note = noteParts.join(' | ')
    const clinic = isReferCase ? ['muang'] : ['nite'] // refer → เมือง / ไม่ refer → NITE

    const result: Question10Result = {
      question: 'InjuryCase',
      question_code: 10,
      question_title: 'ประเมินเคสบาดเจ็บ',
      clinic,
      note,
      symptoms,
      isReferCase,
      type,
    }

    const key = JSON.stringify({ choice, hasCaseDoc, isReferCase, extra, clinic, symptoms, note, type })
    return { key, result }
  }, [choice, hasCaseDoc, isReferCase, noteExtra, type])

  // กันยิงซ้ำค่าเดิม
  const prevKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevKeyRef.current !== computed.key) {
      prevKeyRef.current = computed.key
      onResultRef.current(computed.result)
    }
  }, [computed])

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <label className="block font-medium">โปรดเลือกสถานการณ์ของผู้ป่วย:</label>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="injury-case"
            value="stable"
            checked={choice === 'stable'}
            onChange={() => setChoice('stable')}
          />
          Vital sign stable ไม่มีบาดแผล
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="injury-case"
            value="treated"
            checked={choice === 'treated'}
            onChange={() => setChoice('treated')}
          />
          ได้รับการรักษาแล้ว หรือไม่มีการบาดเจ็บรุนแรง เช่น แผลฉีกขาด หรือกระดูกหัก
        </label>
      </div>

      <div>
        <p className="font-medium">มีใบคดีมาด้วยหรือไม่?</p>
        <div className="flex items-center gap-6">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="case-doc"
              checked={hasCaseDoc === true}
              onChange={() => setHasCaseDoc(true)}
              className="mr-2"
            />
            มีใบคดี
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="case-doc"
              checked={hasCaseDoc === false}
              onChange={() => setHasCaseDoc(false)}
              className="mr-2"
            />
            ไม่มีใบคดี
          </label>
        </div>
      </div>

      {/* ✅ เพิ่มช่องติ๊ก Case Refer */}
      <div>
        <label className="inline-flex items-center mt-2">
          <input
            type="checkbox"
            checked={isReferCase}
            onChange={(e) => setIsReferCase(e.target.checked)}
            className="mr-2"
          />
          Case Refer ที่ไม่ได้ส่งตามระบบ
        </label>
      </div>

      <div>
        <label htmlFor="noteExtra" className="block mt-2 font-medium">
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <textarea
          id="noteExtra"
          value={noteExtra}
          onChange={(e) => setNoteExtra(e.target.value)}
          rows={2}
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ตำแหน่งบาดแผล"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
    </div>
  )
}
