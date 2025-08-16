'use client'

import { useEffect, useRef, useState } from 'react'
import ReusablePopup from '@/app/components/ui/popup/ReusablePopup'
import { PhoneCall } from 'lucide-react'

export interface Question14Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  symptoms: string[]
  routedBy: 'auto'
}

interface Props {
  onResult: (result: Question14Result | null) => void
}

export default function Question14_RespInfect({ onResult }: Props) {
  const [suspectDisease, setSuspectDisease] = useState('')
  const [ageYears, setAgeYears] = useState<number | ''>('')      // ✅ อายุ
  const [hasCalledOPD, setHasCalledOPD] = useState(false)
  const [customClinic, setCustomClinic] = useState('')
  const [noteExtra, setNoteExtra] = useState('')
  const [showCallPopup, setShowCallPopup] = useState(false)

  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const prevKeyRef = useRef<string>('__INIT__')

  useEffect(() => {
    if (!suspectDisease) {
      if (prevKeyRef.current !== 'EMPTY') {
        prevKeyRef.current = 'EMPTY'
        onResultRef.current(null)
      }
      return
    }

    const symptoms: string[] = ['resp_infect']
    const noteParts: string[] = []
    let clinic: string[] = []

    if (suspectDisease === 'pul_tb') {
      clinic = ['opd203']
      symptoms.push('pulmonary_tb')
      noteParts.push('มีกลุ่มอาการของ Pulmonary TB (vital sign stable)')
    }

    if (suspectDisease === 'infectious_disease') {
      symptoms.push('covid', 'chickenpox', 'herpes_zoster', 'measles', 'rubella', 'hfmd')
      const age = typeof ageYears === 'number' ? ageYears : NaN
      if (!Number.isNaN(age)) noteParts.push(`อายุ ${age} ปี`)

      if (!Number.isNaN(age) && age < 15) {
        if (!hasCalledOPD) {
          const waitingKey = JSON.stringify({ WAIT_PED_CALL: true, age, hasCalledOPD })
          if (prevKeyRef.current !== waitingKey) {
            prevKeyRef.current = waitingKey
            onResultRef.current(null)
          }
          return
        }
        clinic = ['ped']
      } else {
        clinic = ['muang']
        noteParts.push('ส่ง รพ.เมือง')
      }
    }

    if (suspectDisease === 'important_symptom') {
      if (!hasCalledOPD || !customClinic) {
        const waitingKey = JSON.stringify({ WAIT_IMPORTANT: true, hasCalledOPD, customClinic })
        if (prevKeyRef.current !== waitingKey) {
          prevKeyRef.current = waitingKey
          onResultRef.current(null)
        }
        return
      }
      clinic = [customClinic]
      noteParts.push('อาการสำคัญ (vital sign stable) — ประสานห้องตรวจแล้ว')
    }

    const extra = noteExtra.trim()
    if (extra) {
      noteParts.push(extra)
      symptoms.push('resp_infect_note')
    }

    const finalNote = noteParts.join(' | ') || undefined

    const payload: Question14Result = {
      question: 'RespInfect',
      question_code: 14,
      question_title: 'สงสัยโรคติดเชื้อทางเดินหายใจ',
      clinic,
      note: finalNote,
      symptoms,
      routedBy: 'auto',
    }

    const key = JSON.stringify(payload)
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current(payload)
    }
  }, [suspectDisease, ageYears, hasCalledOPD, customClinic, noteExtra])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label htmlFor="suspectDisease" className="block font-medium">
          สงสัยโรคติดเชื้อทางเดินหายใจหรือไม่
        </label>
        <select
          id="suspectDisease"
          value={suspectDisease}
          onChange={(e) => {
            const value = e.target.value
            setSuspectDisease(value)
            setHasCalledOPD(false)
            setCustomClinic('')
            if (value === 'important_symptom') setShowCallPopup(true)
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

      {/* อายุ */}
      {suspectDisease === 'infectious_disease' && (
        <div>
          <label htmlFor="ageYears" className="block font-medium">อายุ (ปี)</label>
          <input
            id="ageYears"
            type="number"
            min={0}
            value={ageYears === '' ? '' : ageYears}
            onChange={(e) => setAgeYears(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full border px-3 py-2 rounded mt-1"
            placeholder="ถ้า < 15 ปี จะส่ง OPD กุมารเวชกรรม (ต้องโทรก่อน)"
          />
          {typeof ageYears === 'number' && ageYears < 15 && (
            <label className="inline-flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={hasCalledOPD}
                onChange={(e) => setHasCalledOPD(e.target.checked)}
              />
              ได้โทรประสาน OPD กุมารเวชกรรมแล้ว
            </label>
          )}
        </div>
      )}

      {/* อาการสำคัญ */}
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
                ห้องตรวจที่ประสานแล้ว
              </label>
              <select
                id="customClinic"
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
          หมายเหตุเพิ่มเติม (ถ้ามี)
        </label>
        <input
          id="noteExtra"
          type="text"
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
