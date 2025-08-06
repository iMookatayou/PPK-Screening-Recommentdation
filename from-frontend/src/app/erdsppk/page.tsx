'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Select from 'react-select'
import {
  CheckCircle,
  Hospital,
  ClipboardList,
  Search,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'
import allQuestionsRaw from '@/app/components/questionpath/allQuestions'
import { getTitle } from '@/app/components/utils/getTitle'
import styles from './styles/Erdsppk.module.css'
import { useToast } from '@/app/components/ui/ToastProvider'

export default function ReferralSystem() {
  const Questions = allQuestionsRaw as Record<
    string,
    React.ComponentType<{ onResult: (result: any) => void; type?: string }>
  >

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [questionResults, setQuestionResults] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  const questionOptions = Object.keys(Questions).map((key, i) => ({
    value: key,
    label: `ข้อที่ ${i + 1}: ${getTitle(i + 1)}`,
  }))

  const getTitleFromKey = (key: string): string => {
    const match = key.match(/\d+/)
    return match ? getTitle(parseInt(match[0])) : ''
  }

  const handleSave = async () => {
  if (saving) return;
  setSaving(true);

  try {
    // STEP 1: ตรวจสอบ Base URL
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl) throw new Error('NEXT_PUBLIC_API_BASE_URL ไม่ถูกตั้งค่าใน .env');

    // STEP 2: ตรวจสอบ token
    const token = localStorage.getItem('token')?.trim();
    if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล');

    // STEP 3: ดึงข้อมูลผู้ใช้จาก /api/me
    const meRes = await fetch(`${baseUrl}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!meRes.ok) {
      const error = await meRes.json().catch(() => ({}));
      throw new Error(error.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งาน');
    }

    const me = await meRes.json();
    const routedBy = me.display_name || me.username || me.name || 'anonymous';

    // STEP 4: เตรียมข้อมูลสำหรับบันทึก
    const patientId = 'anonymous-' + uuidv4();
    const now = new Date().toISOString();

    const resultsToSave = Object.entries(questionResults).map(([key, result], index) => {
      const safeSymptoms = Array.isArray(result?.symptoms)
        ? result.symptoms
        : result?.symptoms !== undefined
        ? [String(result.symptoms)]
        : [];

      const safeClinic = Array.isArray(result?.clinic)
        ? result.clinic
        : result?.clinic
        ? [result.clinic]
        : [];

      return {
        question: key,
        question_code: index + 1,
        question_title: getTitleFromKey(key),
        clinic: safeClinic,
        symptoms: safeSymptoms,
        note: result?.note || '',
        is_refer_case: result?.is_refer_case ?? false,
        type: 'guide',
        routed_by: routedBy,
        created_at: now,
      };
    });

    if (resultsToSave.length === 0) {
      throw new Error('ยังไม่มีข้อมูลคำถามให้บันทึก');
    }

    const summaryClinics = [...new Set(resultsToSave.flatMap((r) => r.clinic || []))];
    const summarySymptoms =
      resultsToSave.length > 0
        ? [...new Set(resultsToSave.flatMap((r) => r.symptoms ?? []))]
        : [];

    // STEP 5: สร้าง payload
    const payload = {
      patient_id: patientId,
      selected_questions: selectedQuestions,
      question_results: resultsToSave,
      summary_clinics: summaryClinics,
      summary_symptoms: summarySymptoms,
    };

    console.log('[📦 ส่งข้อมูลไป backend]:', payload);

    // STEP 6: ส่งไป API
    const saveRes = await fetch(`${baseUrl}/api/referral-guidances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!saveRes.ok) {
      const errorDetails = await saveRes.json().catch(() => null);
      console.error('[❌ API ERROR]', errorDetails);
      throw new Error(errorDetails?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    }

    addToast({
      type: 'success',
      icon: <CheckCircle size={20} />,
      message: 'บันทึกคำแนะนำสำเร็จ',
      position: 'top-right',
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[❌ เกิดข้อผิดพลาด]', error.message);
    addToast({
      type: 'error',
      icon: <AlertCircle size={20} />,
      message: error.message || 'เกิดข้อผิดพลาดขณะบันทึกข้อมูล',
      position: 'top-right',
    });
  } finally {
    setSaving(false);
  }
};

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
          <label className={styles['question-label']}>เลือกคำถามคัดกรอง</label>
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
                      onResult={(res) =>
                        setQuestionResults((prev) => ({
                          ...prev,
                          [key]: {
                            ...res,
                            type: 'guide', 
                          },
                        }))
                      }
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
                      {clinicLabelMap[result?.clinic ?? ''] ?? result?.clinic ?? 'ไม่ระบุ'}
                    </span>
                  </li>
                ))}
              </ul>
            <div className="text-center mt-4">
              <button
                className={styles['btn-confirm']}
                onClick={handleSave}
                disabled={saving}
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
