'use client'

import { useEffect, useRef, useState } from 'react'
import { PhoneCall, AlertTriangle } from 'lucide-react'
import ReusablePopup from '@/app/components/ui/popup/ReusablePopup'

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
  const [symptom, setSymptom] = useState('')
  const [extraNote, setExtraNote] = useState('')
  const [painScale, setPainScale] = useState(3)
  const [isManualRefer, setIsManualRefer] = useState(false)

  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const prevKeyRef = useRef('')
  const [hasTouched, setHasTouched] = useState(false)

  // ===== POPUP STATES =====
  const [showLRPopup, setShowLRPopup] = useState(false)
  const [showManualPopup, setShowManualPopup] = useState(false)

  const week = gestWeek === '' ? 0 : Number(gestWeek)

  // เงื่อนไขที่ควรแจ้งให้ไป LR (แต่ไม่ทำให้เป็น refer case อัตโนมัติ)
  const isLRCondition =
    (symptom === 'pain_pregnancy' && week >= 22) || symptom === 'preeclampsia'

  // เด้งเมื่อเข้าเงื่อนไข LR
  useEffect(() => {
    if (isLRCondition) setShowLRPopup(true)
  }, [isLRCondition, symptom, week])

  // เด้งเมื่อเลือก Manual refer
  useEffect(() => {
    if (isManualRefer) setShowManualPopup(true)
  }, [isManualRefer])

  // ===== ส่งผลลัพธ์ขึ้นพาเรนต์ =====
  useEffect(() => {
    // ยังไม่เลือกอาการ → ส่ง null
    if (!symptom) {
      if (hasTouched) onResultRef.current(null)
      return
    }

    // เริ่มต้นค่าพื้นฐาน
    let clinic = ''
    const noteParts: string[] = []
    const symptoms: string[] = ['pregnancy', symptom]

    // อายุครรภ์ (เมื่อกรอก)
    if (gestWeek !== '') noteParts.push(`อายุครรภ์: ${week} สัปดาห์`)

    // Routing ตามอาการ (ไม่แตะ isReferCase ที่นี่)
    switch (symptom) {
      case 'pain_pregnancy': {
        if (week >= 22) {
          clinic = 'lr'
          noteParts.push('ปวดครรภ์ ≥ 22 สัปดาห์')
          symptoms.push('gest_22_up')
        } else {
          clinic = 'anc'
          noteParts.push('ปวดครรภ์ < 22 สัปดาห์')
          symptoms.push('gest_under_22')
        }
        break
      }
      case 'ectopic': {
        clinic = 'obgy'
        noteParts.push('สงสัย Ectopic pregnancy (VS stable)')
        break
      }
      case 'bleeding_abortion': {
        clinic = 'obgy'
        noteParts.push('Bleeding per vagina R/O abortion (VS stable)')
        break
      }
      case 'preeclampsia': {
        clinic = 'lr'
        noteParts.push('Preeclampsia (BP ≥ 140/90 + อาการแทรกซ้อน)')
        break
      }
      case 'appendicitis': {
        clinic = 'er'
        noteParts.push('ปวดท้องสงสัยไส้ติ่ง')
        // pain scale tags
        symptoms.push('appendicitis', 'pain_scale', `pain_scale_${painScale}`)
        noteParts.push(`ระดับความเจ็บปวด: ${painScale}/7`)
        break
      }
      case 'uti_etc': {
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
    }

    // Checkbox Case refer เท่านั้นที่ทำให้เป็น refer case
    let isReferCase = false
    if (isManualRefer) {
      isReferCase = true
      if (!symptoms.includes('manual_refer')) symptoms.push('manual_refer')
      if (!clinic) {
        clinic = 'obgy'
        noteParts.push('เลือก Refer manual: ส่งนรีเวช')
      }
    }

    // หมายเหตุเพิ่มเติม
    const extra = extraNote.trim()
    if (extra) {
      noteParts.push(extra)
      if (!symptoms.includes('pregnancy_note')) symptoms.push('pregnancy_note')
    }

    // กันกรณียังไม่มี clinic จากการเลือกไม่ครบ
    if (!clinic) {
      onResultRef.current(null)
      return
    }

    const note = noteParts.join(' | ')
    const key = JSON.stringify({
      symptom, week, painScale, extra, isManualRefer, clinic, isReferCase, symptoms, type
    })

    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      onResultRef.current({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestWeek, symptom, extraNote, isManualRefer, painScale, type, hasTouched])

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label htmlFor="gestWeek" className="block font-medium">
          อายุครรภ์ (สัปดาห์)
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
            {[1,2,3,4,5,6,7].map(n => <span key={n}>{n}</span>)}
          </div>
          <div className="text-center text-sm text-gray-700 mt-1">
            ระดับ: <strong>{painScale}</strong>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="extraNote" className="block font-medium">
          หมายเหตุเพิ่มเติม (ถ้ามี)
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
          onChange={(e) => setIsManualRefer(e.target.checked)}
        />
        <label htmlFor="manualRefer">Case refer (ต้องโทร consult แพทย์เวรสูติก่อน)</label>
      </div>

      {/* POPUPS */}
      <ReusablePopup
        isOpen={showLRPopup}
        onClose={() => setShowLRPopup(false)}
        title="ต้องส่งไป LR ด่วน"
        message="อาการเข้าเกณฑ์ห้องคลอด (LR) กรุณาแจ้งพนักงานเปลให้เซ็นรับการนำส่งด่วน"
        icon={<AlertTriangle className="w-6 h-6" />}
        color="red"
        confirmText="รับทราบ"
      />

      <ReusablePopup
        isOpen={showManualPopup}
        onClose={() => setShowManualPopup(false)}
        title="กรุณาโทร consult แพทย์เวรสูติ"
        message="เคส Refer ต้องโทรแจ้งและปรึกษาแพทย์เวรสูติตามตารางเวร"
        icon={<PhoneCall className="w-6 h-6" />}
        color="yellow"
        confirmText="เข้าใจแล้ว"
      />
    </div>
  )
}
