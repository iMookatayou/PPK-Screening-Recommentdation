'use client'

import { useEffect, useState } from 'react'
import ReusablePopup from '@/app/components/ui/ReusablePopup'
import { PhoneCall } from 'lucide-react'

export interface Question14Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  isReferCase: boolean
  routedBy: 'auto'
}

interface Props {
  onResult: (result: Question14Result | null) => void
}

export default function Question14_RespInfect({ onResult }: Props) {
  const [suspectDisease, setSuspectDisease] = useState('')
  const [hasCalledOPD, setHasCalledOPD] = useState(false)
  const [customClinic, setCustomClinic] = useState('')
  const [noteExtra, setNoteExtra] = useState('')
  const [showCallPopup, setShowCallPopup] = useState(false)

  // คอยเช็คเงื่อนไขแล้วค่อยส่งผลลัพธ์
  useEffect(() => {
    if (!suspectDisease) {
      onResult(null) // รีเซตเมื่อยังไม่ได้เลือก
      return
    }

    const symptoms: string[] = ['resp_infect']
    let clinic: string[] = []
    let note = ''
    let isReferCase = false

    if (suspectDisease === 'pul_tb') {
      clinic = ['opd203']
      symptoms.push('pulmonary_tb')
      note = 'มีกลุ่มอาการของ Pulmonary TB (ตามใบคัดกรอง) ที่ vital sign stable'
      isReferCase = true
    }

    if (suspectDisease === 'infectious_disease') {
      clinic = ['opd203']
      symptoms.push('covid', 'chickenpox', 'herpes_zoster', 'measle', 'rubella', 'hfm')
      note =
        'สงสัย COVID-19, Chickenpox, Herpes Zoster, Measles, Rubella, HFMD ที่ vital sign stable'
      isReferCase = true
    }

    if (suspectDisease === 'important_symptom') {
      if (!hasCalledOPD || !customClinic) {
        onResult(null) // ยังเลือกไม่ครบ
        return
      }
      clinic = [customClinic]
      note = `อาการสำคัญ (vital sign stable) ส่งคลินิก: ${customClinic}`
      isReferCase = true
    }

    if (noteExtra.trim()) {
      note += ` | ${noteExtra.trim()}`
    }

    onResult({
      question: 'RespInfect',
      question_code: 14,
      question_title: 'สงสัยโรคติดเชื้อทางเดินหายใจ',
      clinic,
      note,
      symptoms,
      isReferCase,
      routedBy: 'auto',
    })
  }, [suspectDisease, hasCalledOPD, customClinic, noteExtra])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label htmlFor="suspectDisease" className="block font-medium">
          สงสัยโรคติดเชื้อทางเดินหายใจหรือไม่:
        </label>
        <select
          id="suspectDisease"
          title="เลือกประเภทอาการติดเชื้อทางเดินหายใจ"
          value={suspectDisease}
          onChange={(e) => {
            const value = e.target.value
            setSuspectDisease(value)
            setHasCalledOPD(false)
            setCustomClinic('')
            if (value === 'important_symptom') {
              setShowCallPopup(true)
            }
          }}
          className="w-full border px-3 py-2 rounded mt-1"
        >
          <option value="">-- โปรดเลือก --</option>
          <option value="pul_tb">มีกลุ่มอาการของ Pulmonary TB (ตามใบคัดกรอง)</option>
          <option value="infectious_disease">
            สงสัย COVID-19, Chickenpox, Herpes Zoster, Measles, Rubella, HFMD
          </option>
          <option value="important_symptom">อาการสำคัญ (vital sign stable)</option>
        </select>
      </div>

      {suspectDisease === 'important_symptom' && (
        <>
          <div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasCalledOPD}
                onChange={(e) => setHasCalledOPD(e.target.checked)}
              />
              ได้โทรประสานงานกับ OPD แล้ว
            </label>
          </div>

          {hasCalledOPD && (
            <div>
              <label htmlFor="customClinic" className="block font-medium">
                ห้องตรวจที่ประสานแล้ว:
              </label>
              <select
                id="customClinic"
                title="เลือกห้องตรวจที่โทรประสานแล้ว"
                value={customClinic}
                onChange={(e) => setCustomClinic(e.target.value)}
                className="w-full border px-3 py-2 rounded mt-1"
              >
                <option value="">-- โปรดเลือกห้องตรวจ --</option>
                <option value="opd203">OPD 203</option>
                <option value="muang">รพ. เมือง</option>
                <option value="ped">OPD กุมารเวชกรรม</option>
              </select>
            </div>
          )}
        </>
      )}

      <div>
        <label htmlFor="noteExtra" className="block font-medium">
          หมายเหตุเพิ่มเติม (ถ้ามี):
        </label>
        <input
          id="noteExtra"
          type="text"
          title="ระบุหมายเหตุเพิ่มเติม"
          value={noteExtra}
          onChange={(e) => setNoteExtra(e.target.value)}
          placeholder="เช่น มีโรคประจำตัว ประวัติสัมผัส"
          className="w-full border px-3 py-2 rounded mt-1"
        />
      </div>

      <ReusablePopup
        isOpen={showCallPopup}
        onClose={() => setShowCallPopup(false)}
        title="โปรดโทรประสาน OPD ก่อน"
        message="กรุณาโทรแจ้งและประสานห้องตรวจที่เหมาะสมก่อนเลือกส่งต่อ"
        icon={<PhoneCall className="w-6 h-6 animate-pulse" />}
        color="yellow"
        confirmText="เข้าใจแล้ว"
      />
    </div>
  )
}
