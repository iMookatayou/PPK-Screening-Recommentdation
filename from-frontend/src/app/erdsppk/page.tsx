'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Select from 'react-select'
import { CheckCircle, Hospital, ClipboardList, Search, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'
import allQuestionsRaw from '@/app/components/questionpath/allQuestions'
import { getTitle } from '@/app/components/utils/getTitle'

import styles from './styles/Erdsppk.module.css'
import { useToast } from '@/app/components/ui/popup/ToastProvider'
import { authAxios } from '@/lib/axios'

/* ===================== Types ===================== */
type IncomingResult = {
  clinic?: string | string[] | null
  symptoms?: string[] | string
  note?: string
  is_refer_case?: boolean
  isReferCase?: boolean
  // answers?: Record<string, any> // ถ้า UI ยังใช้ภายในให้คอมเมนต์ไว้ แต่อย่าโพสต์ขึ้น backend
}

type GuideResult = {
  clinic: string[]
  symptoms: string[]
  note: string
  is_refer_case: boolean
  type: 'guide'
}

/* ===================== Normalizers ===================== */
function normalizeGuideResult(r: IncomingResult): GuideResult {
  const clinic = Array.isArray(r.clinic)
    ? r.clinic.filter(Boolean).map(String)
    : r.clinic != null
    ? [String(r.clinic)]
    : []

  const symptoms = Array.isArray(r.symptoms)
    ? r.symptoms.filter(Boolean).map(String)
    : r.symptoms != null
    ? [String(r.symptoms)]
    : []

  const isRefer =
    (r as any).is_refer_case ??
    (r as any).isReferCase ??
    (r as any).isRefer ??
    (r as any).refer ??
    false

  return {
    clinic,
    symptoms,
    note: r.note ?? '',
    is_refer_case: !!isRefer,
    type: 'guide',
  }
}

/* ===================== Helpers ===================== */
function extractErrors(err: any): string {
  const msg = err?.response?.data?.message || err?.message
  const errors = err?.response?.data?.errors
  if (errors && typeof errors === 'object') {
    const lines: string[] = []
    Object.entries(errors).forEach(([field, arr]) => {
      const texts = Array.isArray(arr) ? arr : [String(arr)]
      texts.forEach((t) => lines.push(`${field}: ${t}`))
    })
    if (lines.length) return lines.join('\n')
  }
  return msg || 'เกิดข้อผิดพลาด'
}

/* ===================== Component ===================== */
export default function ReferralSystem() {
  const Questions = allQuestionsRaw as Record<
    string,
    React.ComponentType<{ onResult: (result: IncomingResult | null) => void; type?: string }>
  >

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [questionResults, setQuestionResults] = useState<Record<string, GuideResult>>({})
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  const questionOptions = useMemo(
    () =>
      Object.keys(Questions).map((key, i) => ({
        value: key,
        label: `ข้อที่ ${i + 1}: ${getTitle(i + 1)}`,
      })),
    [Questions]
  )

  const getTitleFromKey = (key: string): string => {
    const match = key.match(/\d+/)
    return match ? getTitle(parseInt(match[0], 10)) : ''
  }

  const handleSave = async () => {
    if (saving) return

    if (selectedQuestions.length === 0) {
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: 'กรุณาเลือกหัวข้อคำถามอย่างน้อย 1 ข้อ',
        position: 'top-right',
      })
      return
    }

    const answeredCount = Object.keys(questionResults).length
    if (answeredCount === 0) {
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: 'ยังไม่มีข้อมูลคำถามให้บันทึก',
        position: 'top-right',
      })
      return
    }

    // ต้องมี clinic อย่างน้อย 1 ต่อข้อ
    const invalid = Object.values(questionResults).find(
      (r) => !Array.isArray(r.clinic) || r.clinic.length === 0
    )
    if (invalid) {
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: 'คำถามบางข้อยังไม่ได้เลือกห้องตรวจ (clinic)',
        position: 'top-right',
      })
      return
    }

    setSaving(true)
    try {
      const resultsToSave = Object.entries(questionResults).map(([key, result], index) => ({
        question: key,
        question_code: index + 1,
        question_title: getTitleFromKey(key),
        clinic: result.clinic,
        symptoms: result.symptoms,
        note: result.note || '',
        is_refer_case: !!result.is_refer_case,
        type: 'guide',
      }))

      const payload = {
        question_results: resultsToSave,
      }

      await authAxios.post('/referral-guidances', payload)

      addToast({
        type: 'success',
        icon: <CheckCircle size={20} />,
        message: 'บันทึกคำแนะนำสำเร็จ',
        position: 'top-right',
      })

      setSelectedQuestions([])
      setQuestionResults({})
    } catch (err: any) {
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: extractErrors(err),
        position: 'top-right',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={styles['referral-wrapper']}
      >
        <div className={styles['referral-header']}>
          <h1 className={styles['referral-title-main']}>
            <span>Examination Room</span>
            <motion.div
              animate={{ y: [0, -8, 0, -8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
              style={{ display: 'inline-block', margin: '0 8px' }}
            >
              <ClipboardList style={{ width: 30, height: 30, color: '#1e40af' }} />
            </motion.div>
            <span>Guidance System</span>
          </h1>
          <p className={styles['referral-subtitle']}>
            เลือกหัวข้อคำถามที่เกี่ยวข้อง ระบบจะช่วยแนะนำห้องตรวจที่เหมาะสม
          </p>
        </div>

        <div className={styles['question-select-box']}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search style={{ width: 20, height: 20, color: '#6b7280' }} />
            <div style={{ flex: 1 }}>
              <Select
                isMulti
                options={questionOptions}
                classNamePrefix="select"
                placeholder="พิมพ์เพื่อค้นหาและเลือกได้หลายข้อ"
                value={questionOptions.filter((o) => selectedQuestions.includes(o.value))}
                onChange={(selected) => {
                  const values = Array.isArray(selected) ? selected.map((s) => s.value) : []
                  setSelectedQuestions(values)
                  // ล้างผลคำถามที่ถูกเอาออก
                  setQuestionResults((prev) =>
                    Object.fromEntries(Object.entries(prev).filter(([k]) => values.includes(k)))
                  )
                }}
              />
            </div>
          </div>
        </div>

        {selectedQuestions.length > 0 && (
          <div className={styles['questions-container']}>
            {selectedQuestions.map((key) => {
              const QuestionComponent = Questions[key]
              if (!QuestionComponent) return null
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={styles['question-box']}
                >
                  <div className={styles['question-title']}>{getTitleFromKey(key)}</div>
                  <div className={styles['question-body']}>
                    <QuestionComponent
                      type="guide"
                      onResult={(res: IncomingResult | null) => {
                        if (!res) {
                          setQuestionResults((prev) => {
                            const { [key]: _, ...rest } = prev
                            return rest
                          })
                        } else {
                          setQuestionResults((prev) => ({
                            ...prev,
                            [key]: normalizeGuideResult(res),
                          }))
                        }
                      }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {Object.keys(questionResults).length > 0 && (
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={styles['referral-box']}
          >
            <div className={styles['referral-title']}>
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="inline-block text-green-600"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
              </motion.div>
              ระบบแนะนำให้ส่งต่อไปยังห้องตรวจต่อไปนี้
            </div>
            <ul className={styles['referral-list']}>
              {Object.entries(questionResults).map(([key, result]) => (
                <li key={key} className={styles['referral-item']}>
                  <Hospital className={styles['referral-icon-hospital']} />
                  <span className={styles['referral-item-label']}>{getTitleFromKey(key)}:</span>
                  <span className={styles['referral-item-value']}>
                    {Array.isArray(result.clinic) && result.clinic.length > 0
                      ? result.clinic.map((c) => clinicLabelMap[c] ?? c).join(', ')
                      : 'ไม่ระบุ'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="text-center mt-4">
              <button
                type="button"
                className={styles['btn-confirm']}
                onClick={handleSave}
                disabled={saving || Object.keys(questionResults).length === 0}
              >
                {saving ? 'กำลังบันทึก...' : 'ยืนยันผลการแนะนำ'}
              </button>
            </div>
          </motion.section>
        )}
      </motion.div>
    </div>
  )
}
