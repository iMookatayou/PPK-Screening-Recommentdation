'use client'

import { useEffect, useState, useRef } from 'react'
import { PhoneCall, AlertTriangle } from 'lucide-react'
import ReusablePopup from '@/app/components/ui/ReusablePopup'

export interface Question12Result {
  question: string
  question_code: number
  question_title: string
  clinic: string[]
  note?: string
  isReferCase: boolean
  symptoms: string[]
  type: string
}

interface Question12Props {
  onResult: (result: Question12Result | null) => void
  isANC?: boolean
  type: string
}

export default function Question12_Pregnancy({
  onResult,
  isANC = false,
  type,
}: Question12Props) {
  const [gestWeek, setGestWeek] = useState<number | ''>('')
  const [symptom, setSymptom] = useState<string>('')
  const [extraNote, setExtraNote] = useState<string>('')
  const [painScale, setPainScale] = useState<number>(3)

  const [isManualRefer, setIsManualRefer] = useState<boolean>(false)
  const [showPopup, setShowPopup] = useState(false)
  const [showManualReferPopup, setShowManualReferPopup] = useState(false)

  const shownPopupOnceRef = useRef(false)
  const prevKeyRef = useRef('')
  const [hasTouched, setHasTouched] = useState(false)

  useEffect(() => {
    if (!symptom) {
      if (hasTouched) onResult(null)
      return
    }

    let isReferCase = false
    let clinic = ''
    const noteParts: string[] = []
    const week = gestWeek === '' ? 0 : Number(gestWeek)
    const symptoms = ['pregnancy', symptom]

    if (gestWeek !== '') noteParts.push(`อายุครรภ์: ${week} สัปดาห์`)

    if (symptom === 'appendicitis') {
      noteParts.push(`ระดับความเจ็บปวด: ${painScale}/10`)
    }

    switch (symptom) {
      case 'pain_pregnancy':
        if (week >= 22) {
          clinic = 'lr'
          noteParts.push(`ปวดครรภ์ ≥ ${week} สัปดาห์`)
          symptoms.push('gest_22_up')
          isReferCase = true
          if (!shownPopupOnceRef.current) {
            setShowPopup(true)
            shownPopupOnceRef.current = true
          }
        } else {
          clinic = 'anc'
          noteParts.push(`ปวดครรภ์ < ${week} สัปดาห์`)
          symptoms.push('gest_under_22')
          shownPopupOnceRef.current = false
        }
        break
      case 'ectopic':
        clinic = 'obgy'
        noteParts.push('สงสัย Ectopic pregnancy (VS stable)')
        isReferCase = true
        break
      case 'bleeding_abortion':
        clinic = 'obgy'
        noteParts.push('Bleeding per vagina R/O abortion (VS stable)')
        isReferCase = true
        break
      case 'preeclampsia':
        clinic = 'lr'
        noteParts.push('Preeclampsia (BP ≥ 140/90 + อาการแทรกซ้อน)')
        isReferCase = true
        if (!shownPopupOnceRef.current) {
          setShowPopup(true)
          shownPopupOnceRef.current = true
        }
        break
      case 'appendicitis':
        clinic = 'er'
        noteParts.push('ปวดท้องสงสัยไส้ติ่ง')
        symptoms.push('appendicitis')
        isReferCase = true
        break
      case 'uti_etc':
        if (isANC) {
          clinic = 'anc'
          noteParts.push('ANC เดิม มีอาการไม่รุนแรง (UTI, URI, dyspepsia)')
          symptoms.push('has_anc')
        } else {
          clinic = 'obgy'
          noteParts.push('หญิงตั้งครรภ์ไม่มี ANC เดิม ส่งนรีเวช')
          symptoms.push('no_anc')
        }
        break
    }
    
    if (isManualRefer) {
      isReferCase = true
      if (!clinic) {
        clinic = 'obgy'
        noteParts.push('เลือก Refer manual: ส่งนรีเวช')
      }
    }

    if (extraNote.trim()) {
      noteParts.push(extraNote.trim())
    }

    if (!clinic) {
      onResult(null)
      return
    }

    const note = noteParts.join(' | ')
    const key = `${symptom}-${week}-${painScale}-${extraNote}-${isManualRefer}`

    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResult({
        question: 'PregnancyCase',
        question_code: 12,
        question_title: 'หญิงตั้งครรภ์ที่มีอาการ',
        clinic: [clinic],
        note,
        isReferCase,
        symptoms,
        type,
      })
    }
  }, [gestWeek, symptom, extraNote, isManualRefer, painScale, type])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label htmlFor="gestWeek" className="block font-medium">
          อายุครรภ์ (สัปดาห์):
        </label>
        <input
          id="gestWeek"
          type="number"
          className="w-full border px-3 py-2 rounded"
          value={gestWeek === '' ? '' : gestWeek}
          onChange={(e) =>
            setGestWeek(e.target.value === '' ? '' : Number(e.target.value))
          }
          placeholder="ระบุจำนวนสัปดาห์"
        />
      </div>

      <div>
        <label className="block font-medium">อาการ:</label>
        <select
          title="เลือกอาการในหญิงตั้งครรภ์"
          className="w-full border px-3 py-2 rounded"
          value={symptom}
          onChange={(e) => {
            setSymptom(e.target.value)
            setHasTouched(true)
            shownPopupOnceRef.current = false
            setPainScale(3)
          }}
        >
          <option value="">-- โปรดเลือกอาการ --</option>
          <option value="pain_pregnancy">มาห้องคลอด เช่น ปวดท้อง เจ็บครรภ์ เด็กไม่ดิ้น</option>
          <option value="ectopic">สงสัย Ectopic pregnancy (VS stable)</option>
          <option value="bleeding_abortion">มีเลือดออกทางช่องคลอด (VS stable)</option>
          <option value="preeclampsia">ความดันสูง ≥ 140/90 + ปวดหัว/ตาพร่า</option>
          <option value="appendicitis">ปวดท้องเฉียบพลันสงสัยไส้ติ่ง</option>
          <option value="uti_etc">อาการอ่อนๆ เช่น UTI, URI, dyspepsia</option>
        </select>
      </div>

      {symptom === 'appendicitis' && (
        <div>
          <label htmlFor="painScale" className="block font-medium mb-1">
            ระดับความเจ็บปวด (1–7):
          </label>
          <input
            id="painScale"
            type="range"
            min={1}
            max={7}
            step={1}
            value={painScale}
            onChange={(e) => setPainScale(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 px-1 mt-1">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div className="text-center text-sm text-gray-700 mt-1">
            ระดับ: <strong>{painScale}</strong>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="extraNote" className="block font-medium">
          หมายเหตุเพิ่มเติม (ถ้ามี):
        </label>
        <textarea
          id="extraNote"
          className="w-full border px-3 py-2 rounded"
          rows={2}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="ระบุรายละเอียดเพิ่มเติม เช่น lab, ประวัติเคส ฯลฯ"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="manualRefer"
          checked={isManualRefer}
          onChange={(e) => {
            const checked = e.target.checked
            setIsManualRefer(checked)
            if (checked) {
              setShowManualReferPopup(true)
            }
          }}
        />
        <label htmlFor="manualRefer">
          Case refer (ต้องโทร consult แพทย์เวรสูติก่อน)
        </label>
      </div>

      <ReusablePopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        title="โปรดแจ้งพนักงานเปล"
        message="ต้องส่งต่อไปยัง LR กรุณาแจ้งพนักงานเปลให้เซ็นรับการนำส่งด่วน"
        icon={<AlertTriangle className="w-6 h-6 animate-ping" />}
        color="red"
      />

      <ReusablePopup
        isOpen={showManualReferPopup}
        onClose={() => setShowManualReferPopup(false)}
        title="โปรดโทร consult แพทย์เวรสูติก่อน"
        message="เคส Refer นี้จำเป็นต้องโทรแจ้งและปรึกษาแพทย์เวรสูติตามตารางเวร"
        icon={<PhoneCall className="w-6 h-6 animate-pulse" />}
        color="yellow"
        confirmText="เข้าใจแล้ว"
      />
    </div>
  )
}
