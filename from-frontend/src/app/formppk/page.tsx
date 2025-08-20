'use client'

import React, { useState, useEffect, useRef } from 'react'
import Select from 'react-select'
import { useRouter } from 'next/navigation'
import { useThaiID } from '@/app/ClientLayout'
import { getTitle } from '@/app/components/utils/getTitle'
import allQuestionsRaw from '@/app/components/questionpath/allQuestions'
import { checkRouting } from '@/app/components/utils/routingRules'
import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'
import { CheckCircle, Hospital, AlertCircle, Trash2 } from '@/icons'
import { motion } from 'framer-motion'
import styles from './styles/Formppk.module.css'
import '../../../public/styles/form-ppk.css'
import { useToast } from '@/app/components/ui/popup/ToastProvider'
import { v4 as uuidv4 } from 'uuid'
import type {
  PatientData,
  FormDraft,
  QuestionResult,
  QuestionResultWithMeta,
  FormPPKPayload
} from '@/app/types/globalType'

import { useAuth } from '@/app/context/AuthContext'
import { authAxios } from '@/lib/axios'

export default function FormContent() {
  const { data: thaiIDData, resetData } = useThaiID()
  const router = useRouter()

  const [manualData, setManualData] = useState<PatientData>({
    cid: '',
    titleNameTh: '',
    firstNameTh: '',
    lastNameTh: '',
    birthDate: '',
    gender: '',
    address: {
      Full: '',
      HouseNo: '',
      Tumbol: '',
      Amphur: '',
      Province: '',
      Moo: '',
    },
    issueDate: '',
    expiryDate: '',
    maininscl_name: '',
    hmain_name: '',
    hsub_name: '',
    primary_province_name: '',
    primary_amphur_name: '',
    primary_tumbon_name: '',
    primary_mooban_name: '',
    photo: '',
  })

  const Questions = allQuestionsRaw as Record<
    string,
    React.ComponentType<{ onResult: (result: any) => void; type?: string }>
  >

  const normalizeFormDraft = (r: any): {
    clinic: string[];
    symptoms: string[];
    note: string;
    is_refer_case: boolean;
  } => {
    const toArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter(Boolean).map(String) : v != null ? [String(v)] : []
    if (!r) return { clinic: [], symptoms: [], note: '', is_refer_case: false }
    const isRefer = r.is_refer_case ?? r.isReferCase ?? r.isRefer ?? r.refer ?? false
    return {
      clinic: toArray(r.clinic),
      symptoms: toArray(r.symptoms),
      note: (r.note ?? '').toString(),
      is_refer_case: !!isRefer,
    }
  }

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [selectedQuestionKeys, setSelectedQuestionKeys] = useState<string[]>([])
  const [questionResults, setQuestionResults] = useState<Record<string, FormDraft>>({})
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [routingClinics, setRoutingClinics] = useState<string[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [finished, setFinished] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { addToast } = useToast()
  const { user } = useAuth()
  const hasRedirected = useRef(false)

  // —— refs สำหรับ toast/สิทธิ ——
  const rightsTidRef = useRef<number | null>(null)
  const lastRightsCidRef = useRef<string | null>(null)
  const prevCidRef = useRef<string | null>(null)
  const seenCidsRef = useRef<Set<string>>(new Set()) // กันแสดงซ้ำเมื่อ cid เดิมวนกลับมา

  useEffect(() => {
    setSelectedQuestionKeys(selectedQuestions)
  }, [selectedQuestions])

  const questionOptions = Object.keys(Questions).map((key, index) => ({
    value: key,
    label: `ข้อที่ ${index + 1}: ${getTitle(index + 1)}`,
  }))

  function getTitleFromKey(key: string): string {
    const match = key.match(/\d+/)
    if (!match) return ''
    const index = parseInt(match[0], 10)
    return getTitle(index)
  }

  const s = (v?: string) => v ?? ''

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setManualData(prev => ({ ...prev, [field]: value ?? '' }))
  }

  const getAgeFromBirthDate = (birthDate?: string): string => {
    if (!birthDate || birthDate.length < 8) return 'ไม่ระบุ'
    const y = parseInt(birthDate.substring(0, 4), 10)
    const yearCE = y > 2500 ? y - 543 : y
    const m = parseInt(birthDate.substring(4, 6), 10) - 1
    const d = parseInt(birthDate.substring(6, 8), 10)
    const birth = new Date(yearCE, m, d)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
    return isNaN(age) ? 'ไม่ระบุ' : String(age)
  }

  const formatDateForInput = (raw: string, _isBirthDate: boolean = false): string => {
    if (!raw) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    if (/^\d{8}$/.test(raw)) {
      const yyyy = parseInt(raw.substring(0, 4), 10)
      const mm = raw.substring(4, 6)
      const dd = raw.substring(6, 8)
      return `${yyyy}-${mm}-${dd}`
    }
    if (raw.includes('/')) {
      const [dd, mm, yyyy] = raw.split('/')
      return `${yyyy}-${mm}-${dd}`
    }
    return raw
  }

  const handleQuestionAnswer = (key: string, answer: any) => {
    const result = checkRouting({ [key]: answer })
    setRoutingClinics(result)
    setShowConfirm(result.length > 0)
  }

  // ========== A) ซิงค์ข้อมูลจาก ThaiIDProvider → ฟอร์ม + แสดง toast “อ่านบัตรสำเร็จ” ==========
  useEffect(() => {
    if (!thaiIDData) return

    // sync field (กัน undefined ด้วย ??)
    setManualData(prev => ({
      ...prev,
      cid: thaiIDData.cid ?? prev.cid,
      titleNameTh: thaiIDData.titleNameTh ?? prev.titleNameTh,
      firstNameTh: thaiIDData.firstNameTh ?? prev.firstNameTh,
      lastNameTh: thaiIDData.lastNameTh ?? prev.lastNameTh,
      birthDate: thaiIDData.birthDate ?? prev.birthDate,
      gender: thaiIDData.gender ?? prev.gender,
      address: {
        Full: thaiIDData.address?.Full ?? prev.address.Full,
        HouseNo: thaiIDData.address?.HouseNo ?? prev.address.HouseNo,
        Tumbol: thaiIDData.address?.Tumbol ?? prev.address.Tumbol,
        Amphur: thaiIDData.address?.Amphur ?? prev.address.Amphur,
        Province: thaiIDData.address?.Province ?? prev.address.Province,
        Moo: thaiIDData.address?.Moo ?? prev.address.Moo,
      },
      photo: thaiIDData.photo ?? prev.photo,
    }))

    // แสดง toast แค่ครั้งแรกของแต่ละ CID (ป้องกันเด้งรัว/ซ้ำ)
    const newCid = thaiIDData.cid?.trim()
    const prevCid = prevCidRef.current
    if (newCid && newCid !== prevCid && !seenCidsRef.current.has(newCid)) {
      addToast({
        type: 'success',
        message: 'บัตรประชาชนอ่านสำเร็จ',
        position: 'top-right',
        duration: 2400,
      })
      prevCidRef.current = newCid
      seenCidsRef.current.add(newCid)
    }
  }, [thaiIDData, addToast])

  // ========== B) เช็คสิทธิผ่าน API proxy /api/rights ==========
  const dmYtoYmd = (s?: string | null) => {
    if (!s) return ''
    const [dd, mm, yyyy] = s.split('/')
    if (!dd || !mm || !yyyy) return ''
    return `${yyyy}-${mm}-${dd}`
  }

  const checkRights = React.useCallback(async (cid: string) => {
    if (lastRightsCidRef.current === cid) return
    lastRightsCidRef.current = cid

    const ctrl = new AbortController()
    rightsTidRef.current = window.setTimeout(() => ctrl.abort(), 8000)

    try {
      const res = await fetch(`/api/form/v1/searchCurrentByPID?cid=${cid}`, { signal: ctrl.signal, cache: 'no-store' })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        addToast({
          type: 'warning',
          message: body?.error || 'ตรวจสอบสิทธิไม่สำเร็จ',
          position: 'top-right',
          duration: 3500,
        })
        setManualData(prev => ({ ...prev, maininscl_name: '', hmain_name: '', hsub_name: '', issueDate: '', expiryDate: '' }))
        return
      }

      if (body.status === 'not_found') {
        addToast({
          type: 'warning',
          message: body?.message || 'ไม่พบสิทธิการรักษาในระบบ',
          position: 'top-right',
          duration: 3500,
        })
        setManualData(prev => ({ ...prev, maininscl_name: '', hmain_name: '', hsub_name: '', issueDate: '', expiryDate: '' }))
        return
      }

      if (body.status !== 'success') {
        addToast({
          type: 'error',
          message: body?.message || 'ตรวจสอบสิทธิไม่สำเร็จ',
          position: 'top-right',
        })
        setManualData(prev => ({ ...prev, maininscl_name: '', hmain_name: '', hsub_name: '', issueDate: '', expiryDate: '' }))
        return
      }

      setManualData(prev => ({
        ...prev,
        maininscl_name: body.insuranceType ?? '',
        hmain_name: body.registeredHospital ?? '',
        hsub_name: body.subHospital ?? '',
        issueDate: dmYtoYmd(body.startDate),
        expiryDate: dmYtoYmd(body.expDate),
      }))

      addToast({
        type: 'info',
        message: (
          <div>
            <div><b>ตรวจสอบสิทธิสำเร็จ</b></div>
            <div>สิทธิ: {body.insuranceType || '-'}</div>
            <div>โรงพยาบาลหลัก: {body.registeredHospital || '-'}</div>
          </div>
        ),
        position: 'top-right',
        duration: 3500,
      })
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        addToast({
          type: 'error',
          message: 'ตรวจสอบสิทธิล้มเหลว (เครือข่าย/ปลายทางไม่ตอบ)',
          position: 'top-right',
        })
        setManualData(prev => ({ ...prev, maininscl_name: '', hmain_name: '', hsub_name: '', issueDate: '', expiryDate: '' }))
      }
    } finally {
      if (rightsTidRef.current) { clearTimeout(rightsTidRef.current); rightsTidRef.current = null }
    }
  }, [addToast])

  // ========== C) มี CID 13 หลักเมื่อไร → รีเซ็ตผลลัพธ์บางส่วน + เช็คสิทธิ ==========
  useEffect(() => {
    const cid = (manualData.cid || thaiIDData?.cid || '').trim()
    if (!/^\d{13}$/.test(cid)) return

    setSelectedQuestions([])
    setSelectedQuestionKeys([])
    setQuestionResults({})
    setFinished(false)

    checkRights(cid)
  }, [manualData.cid, thaiIDData?.cid, checkRights])

  // ===== ล้างฟอร์ม =====
  const handleClearForm = () => {
    resetData()
    setManualData({
      cid: '',
      titleNameTh: '',
      firstNameTh: '',
      lastNameTh: '',
      birthDate: '',
      gender: '',
      address: {
        Full: '',
        HouseNo: '',
        Tumbol: '',
        Amphur: '',
        Province: '',
        Moo: '',
      },
      issueDate: '',
      expiryDate: '',
      maininscl_name: '',
      hmain_name: '',
      hsub_name: '',
      primary_province_name: '',
      primary_amphur_name: '',
      primary_tumbon_name: '',
      primary_mooban_name: '',
      photo: '',
    })

    addToast({ type: 'success', message: 'ล้างข้อมูลเรียบร้อยแล้ว', position: 'top-right', duration: 3000 })
    router.refresh()
  }

  // ===== บันทึก =====
  const handleSave = async () => {
    if (isLoading) return
    if (!manualData.cid || !/^\d{13}$/.test(manualData.cid)) {
      addToast({ type: 'error', icon: <AlertCircle size={20} />, message: 'เลขบัตรประชาชนไม่ถูกต้อง', position: 'top-right' })
      return
    }
    if (!manualData.firstNameTh?.trim() || !manualData.lastNameTh?.trim()) {
      addToast({ type: 'error', icon: <AlertCircle size={20} />, message: 'กรุณากรอกชื่อ-นามสกุลให้ครบ', position: 'top-right' })
      return
    }
    if (selectedQuestions.length === 0) {
      addToast({ type: 'error', icon: <AlertCircle size={20} />, message: 'กรุณาเลือกหัวข้อคำถามอย่างน้อย 1 ข้อ', position: 'top-right' })
      return
    }

    setIsLoading(true)
    try {
      const meRes = await authAxios.get('/me')
      const me = meRes.data || {}
      const routedBy = me.display_name || me.username || me.name || 'unknown'

      const caseId = uuidv4()
      const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ')

      const toArray = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter(Boolean).map(String) : v != null ? [String(v)] : []

      const resultsToSave = selectedQuestions.map((key, idx) => {
        const draft = (questionResults as any)[key] || {}
        const clinic = toArray(draft.clinic)
        const symptoms = toArray(draft.symptoms)
        return {
          case_id: caseId,
          question: key,
          question_key: key,
          question_code: idx + 1,
          question_title: getTitleFromKey(key),
          clinic,
          symptoms,
          note: (draft.note ?? '').toString(),
          is_refer_case: !!draft.is_refer_case,
          type: 'form',
          routed_by: routedBy,
          created_at: createdAt,
        }
      })

      const summaryClinics = [...new Set(resultsToSave.flatMap(r => r.clinic))]
      const summarySymptoms = [...new Set(resultsToSave.flatMap(r => r.symptoms))]

      const ageFromBirth = (() => {
        const raw = manualData.birthDate
        if (!raw || raw.length < 8) return 0
        const y = parseInt(raw.substring(0, 4), 10)
        const yearCE = y > 2500 ? y - 543 : y
        const m = parseInt(raw.substring(4, 6), 10) - 1
        const d = parseInt(raw.substring(6, 8), 10)
        const birth = new Date(yearCE, m, d)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
        return Number.isNaN(age) ? 0 : age
      })()

      const payload: FormPPKPayload = {
        case_id: caseId,
        cid: manualData.cid.trim(),
        name: `${s(manualData.titleNameTh)}${s(manualData.firstNameTh)} ${s(manualData.lastNameTh)}`.trim(),
        age: ageFromBirth,
        gender: manualData.gender || '',
        maininscl_name: s(manualData.maininscl_name) || 'ไม่มีการบันทึกสิทธิการรักษา',
        hmain_name: s(manualData.hmain_name) || 'ไม่มีการบันทึกสิทธิการรักษา',
        summary_clinics: summaryClinics,
        symptoms: summarySymptoms.length ? summarySymptoms : ['ไม่มีอาการ'],
        question_results: resultsToSave,
        created_at: createdAt,
      }

      await authAxios.post('/form-ppk', payload)

      const printData = {
        patientName: `${s(manualData.titleNameTh)}${s(manualData.firstNameTh)} ${s(manualData.lastNameTh)}`.trim(),
        gender: manualData.gender || 'ไม่ระบุ',
        maininscl_name: payload.maininscl_name,
        printedAt: new Date().toISOString(),
        routedBy: me?.name || 'ไม่ระบุ',
        diseases: [...new Set(resultsToSave.map(r => r.question_title))],
        topics: resultsToSave.map(r => ({ code: r.question_code, title: r.question_title, note: r.note || '-' })),
        referredClinics: [...new Set(resultsToSave.flatMap(r => r.clinic))],
      }
      try { localStorage.setItem('printSummary', JSON.stringify(printData)) } catch {}

      addToast({
        type: 'success',
        icon: <CheckCircle size={20} />,
        message: 'บันทึกข้อมูลสำเร็จ! คุณสามารถกด "พิมพ์แบบฟอร์ม" ได้',
        position: 'top-right',
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: err?.response?.data?.message || err?.message || 'บันทึกไม่สำเร็จ',
        position: 'top-right',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ===== เตรียมข้อมูลพิมพ์หลังจบ =====
  useEffect(() => {
    if (!finished || hasRedirected.current) return

    const qWithMeta: QuestionResultWithMeta[] = Object.entries(questionResults).map(([key, draft], idx) => {
      const safeSymptoms = Array.isArray(draft.symptoms)
        ? draft.symptoms.filter(Boolean).map(String)
        : draft.symptoms != null ? [String(draft.symptoms)] : []
      const safeClinic: string[] = Array.isArray(draft.clinic)
        ? draft.clinic.map(String).filter(Boolean)
        : draft.clinic ? [String(draft.clinic)] : []
      return {
        case_id: 'print-only',
        question_key: key,
        clinic: safeClinic,
        is_refer_case: !!draft.is_refer_case,
        note: draft.note ?? '',
        symptoms: safeSymptoms,
        routed_by: user?.name || 'ไม่ระบุ',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        question: key,
        question_code: idx + 1,
        question_title: getTitleFromKey(key) || `คำถาม ${idx + 1}`,
        isReferCase: !!draft.is_refer_case,
        type: 'form',
      }
    })

    const summaryClinics = [...new Set(qWithMeta.flatMap(q => (q.clinic.length > 0 ? q.clinic : [])))]
    const diseases = [...new Set(qWithMeta.map(q => (q.question_title || '').trim()).filter(Boolean))]
    const rightsNote =
      (manualData.maininscl_name?.trim() || manualData.hmain_name?.trim())
        ? `${manualData.maininscl_name || ''} ${manualData.hmain_name || ''}`.trim()
        : 'ไม่มีการบันทึกสิทธิการรักษา'

    const printData = {
      patientName: `${s(manualData.titleNameTh)}${s(manualData.firstNameTh)} ${s(manualData.lastNameTh)}`.trim(),
      printedAt: new Date().toISOString(),
      routedBy: user?.name || 'ไม่ระบุ',
      rightsNote,
      diseases,
      topics: qWithMeta.map(q => ({ code: q.question, title: q.question_title, note: q.note || '-' })),
      referredClinics: summaryClinics.map((code: string) => clinicLabelMap[code] || code),
    }

    try { localStorage.setItem('printSummary', JSON.stringify(printData)) } catch {}
    hasRedirected.current = true
  }, [finished, questionResults, manualData, user])

  const patientInfo = manualData

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      
      {/* ฟอร์มหลัก */}
      <form className="form-ppk">
        <fieldset className="form-tight">
          <legend>ข้อมูลผู้ป่วย / Patient information</legend>

          <div className="form-header">
            <div className="form-left">
              <div className="tight-row">
                <label htmlFor="titleNameTh">คำนำหน้า:</label>
                <input id="titleNameTh" name="titleNameTh" defaultValue={patientInfo.titleNameTh} placeholder="นาย / นางสาว" required />

                <label htmlFor="firstNameTh">ชื่อ:</label>
                <input id="firstNameTh" name="firstNameTh" defaultValue={patientInfo.firstNameTh} placeholder="ชื่อ" required />

                <label htmlFor="lastNameTh">นามสกุล:</label>
                <input id="lastNameTh" name="lastNameTh" defaultValue={patientInfo.lastNameTh} placeholder="นามสกุล" required />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap', // ถ้าหน้าจอแคบจะตัดบรรทัด
                  gap: '12px',
                  marginBottom: '8px',
                }}
              >
                <label htmlFor="gender" style={{ whiteSpace: 'nowrap' }}>
                  เพศ:
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="1"
                    checked={
                      patientInfo.gender === '1' ||
                      (thaiIDData?.gender === '1' &&
                        patientInfo.gender !== '2' &&
                        patientInfo.gender !== '3')
                    }
                    onChange={() => handleInputChange('gender', '1')}
                  />
                  ชาย
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="2"
                    checked={
                      patientInfo.gender === '2' ||
                      (thaiIDData?.gender === '2' &&
                        patientInfo.gender !== '1' &&
                        patientInfo.gender !== '3')
                    }
                    onChange={() => handleInputChange('gender', '2')}
                  />
                  หญิง
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="3"
                    checked={
                      patientInfo.gender === '3' ||
                      (thaiIDData?.gender === '3' &&
                        patientInfo.gender !== '1' &&
                        patientInfo.gender !== '2')
                    }
                    onChange={() => handleInputChange('gender', '3')}
                  />
                  ไม่ทราบแน่ชัด
                </label>

                {/* HN ต่อท้ายใน row เดียวกัน
                <label htmlFor="hn" style={{ : '24px' }}>
                  HN:
                </label>
                <input
                  id="hn"
                  name="hn"
                  value={. || ''}
                  readOnly
                  style={{
                    width: '150px',
                    padding: '2px 4px',
                    border: 'none',
                    borderBottom: '1px dotted #000', // เส้นไข่ปลา
                    background: 'transparent',
                    outline: 'none',
                  }}
                /> */}
              </div>

              <div className="tight-row">
                <label htmlFor="birthDate">วันเกิด:</label>
                  <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={formatDateForInput(manualData.birthDate, true)}
                    readOnly
                  />

                <label htmlFor="cid">เลขบัตรประชาชน:</label>
                  <input
                    id="cid"
                    name="cid"
                    value={patientInfo.cid}
                    onChange={(e) => handleInputChange('cid', e.target.value)}
                    pattern="\d{13}"
                    title="เลข 13 หลัก"
                    placeholder="เลข 13 หลัก"
                    required
                  />  

                <label htmlFor="age">อายุ:</label>
                  <input
                    id="age"
                    name="age"
                    value={getAgeFromBirthDate(manualData.birthDate)}
                    readOnly
                  />
                </div>
              </div>

              {patientInfo.photo ? (
                <div className="form-photo-wrapper">
                  <div className="form-photo">
                    <img
                      src={patientInfo.photo}
                      alt="รูปบัตรประชาชน"
                      style={{
                        maxWidth: '120px',
                        maxHeight: '160px',
                        objectFit: 'cover',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="form-photo-wrapper">
                  <div className="form-photo no-photo">
                    <span>ไม่มีรูปบัตรประชาชน</span>
                  </div>
                </div>
              )}
          </div>

          <div className="section-divider" />

            <div className="form-bottom-row">
              <div className="form-half form-border-right">
                <div className="section-title">สิทธิการรักษา / Right to treatment</div>

                <div className="tight-row">
                  <label htmlFor="maininscl_name">สิทธิ:</label>
                  <input
                    id="maininscl_name"
                    name="maininscl_name"
                    value={patientInfo.maininscl_name || ''}
                    placeholder="สิทธิการรักษา"
                    readOnly
                  />
                </div>

                {/* หน่วยบริการต้น */}
                <div className="tight-row unit-field">
                  <label htmlFor="hmain_name">หน่วยบริการต้น:</label>
                  <input
                    id="hmain_name"
                    name="hmain_name"
                    value={patientInfo.hmain_name || ''}
                    placeholder="โรงพยาบาลต้นสิทธิ"
                    readOnly
                  />
                </div>

                <div className="tight-row unit-field">
                  <label htmlFor="hsub_name">หน่วยบริการรอง:</label>
                  <input
                    id="hsub_name"
                    name="hsub_name"
                    value={patientInfo.hsub_name || ''}
                    placeholder="หน่วยบริการรอง"
                    readOnly
                  />
                </div>

                <div className="tight-row">
                  <label htmlFor="issueDate">วันที่เริ่มต้นสิทธิ:</label>
                  <input
                    type="date"
                    id="issueDate"
                    name="issueDate"
                    className="date-field"
                    value={formatDateForInput(patientInfo.issueDate)}
                    readOnly
                  />
                </div>

                <div className="tight-row">
                  <label htmlFor="expiryDate">วันหมดอายุสิทธิ:</label>
                  <input
                    type="date"
                    id="expiryDate"
                    name="expiryDate"
                    className="date-field"
                    value={formatDateForInput(patientInfo.expiryDate)}
                    readOnly
                  />
                </div>
              </div>

            <div className="form-half">
              <div className="section-title">ที่อยู่ตามบัตรประชาชน / Address</div>

              <div className="address-row">

                <div className="tight-row">
                  <label htmlFor="address">ที่อยู่รวม:</label>
                  <input
                    id="address"
                    name="address"
                    value={patientInfo.address?.Full || ''}
                    readOnly
                    className="full"
                  />
                </div>

                <div className="tight-row">
                  <label htmlFor="house_no">บ้านเลขที่:</label>
                  <input
                    id="house_no"
                    name="house_no"
                    value={patientInfo.address?.HouseNo || ''}
                    readOnly
                    className="short"
                  />
                </div>

                <div className="tight-row">
                  <label htmlFor="moo">หมู่:</label>
                  <input
                    id="moo"
                    name="moo"
                    value={patientInfo.address?.Moo || ''}
                    readOnly
                    className="xshort"
                  />
                </div>

                <div className="tight-row">
                  <label htmlFor="tumbol">ตำบล:</label>
                  <input
                    id="tumbol"
                    name="tumbol"
                    value={patientInfo.address?.Tumbol || ''}
                    readOnly
                    className="medium"
                  />
                </div>

                <div className="tight-row">
                  <label htmlFor="amphur">อำเภอ:</label>
                  <input
                    id="amphur"
                    name="amphur"
                    value={patientInfo.address?.Amphur || ''}
                    readOnly
                    className="medium"
                  />
                </div>

                <div className="tight-row">
                  <label htmlFor="province">จังหวัด:</label>
                  <input
                    id="province"
                    name="province"
                    value={patientInfo.address?.Province || ''}
                    readOnly
                    className="medium"
                  />
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Section: แถวเดียวกัน - เลือกหัวข้อ + ล้างข้อมูล */}
        <div className={styles['formppk-question-select-row']}>
          <div className={styles['formppk-question-select-box']}>
            <label className={styles['formppk-question-label']}>เลือกหัวข้อคำถามที่ต้องการ</label>
            <Select
              isMulti
              name="questions"
              options={questionOptions}
              classNamePrefix="select"
              placeholder="เลือกได้หลายหัวข้อ"
              value={questionOptions.filter(option => selectedQuestions.includes(option.value))}
              onChange={(selected) => {
                const values = Array.isArray(selected) ? selected.map(o => o.value) : []
                setSelectedQuestions(values)
                setQuestionResults(prev =>
                  Object.fromEntries(Object.entries(prev).filter(([k]) => values.includes(k)))
                )
              }}
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '46px', // ลดจาก 52px
                  fontSize: '0.95rem',
                }),
                valueContainer: (base) => ({
                  ...base,
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  gap: '6px',
                }),
                multiValue: (base) => ({
                  ...base,
                  fontSize: '0.95rem',
                  padding: '3px 6px',
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  fontSize: '0.85rem',
                }),
                multiValueRemove: (base) => ({
                  ...base,
                  fontSize: '1rem',
                }),
                placeholder: (base) => ({
                  ...base,
                  fontSize: '0.95rem',
                }),
                input: (base) => ({
                  ...base,
                  fontSize: '0.95rem',
                }),
              }}
            />
          </div>

          <motion.button
            type="button"
            onClick={handleClearForm}
            className={styles['formppk-btn-clear']}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Trash2 className={styles['formppk-btn-clear-icon']} size={16} strokeWidth={1.6} />
            ล้างข้อมูล
          </motion.button>
        </div>

        {selectedQuestions.length > 0 && (
          <div className={styles['formppk-questions-container']}>
            {selectedQuestions.map((key) => {
              const QuestionComponent = Questions[key]
              if (!QuestionComponent) return null

              return (
                <div key={key} className={styles['formppk-question-box']}>
                  <div className={styles['formppk-question-title']}>{getTitleFromKey(key)}</div>
                  <div className={styles['formppk-question-body']}>
                    <QuestionComponent
                      type="form"
                      onResult={(res: any) => {
                        if (res == null) {
                          setQuestionResults(prev => {
                            const { [key]: _, ...rest } = prev
                            return rest
                          })
                        } else {
                          setQuestionResults(prev => ({
                            ...prev,
                            [key]: normalizeFormDraft(res),
                          }))
                        }
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* กล่องแสดงผลแนะนำห้องตรวจ */}
          {Object.keys(questionResults).length > 0 && !finished && (
            <section className={styles['formppk-referral-box']}>
              <div className={styles['formppk-referral-title']}>
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className={styles['formppk-referral-icon-success']}
                >
                  <CheckCircle />
                </motion.div>
                ระบบแนะนำให้ส่งต่อไปยัง
              </div>

              <ul className={styles['formppk-referral-list']}>
                {/* วนตาม selectedQuestions เพื่อคงลำดับ */}
                {selectedQuestions
                  .filter(key => questionResults[key]?.clinic)
                  .map((key) => {
                    const result = questionResults[key];

                    if (!result || !result.clinic) return null;

                    const clinic = result.clinic; 

                    return (
                      <li key={key} className={styles['formppk-referral-item']}>
                        <Hospital className={styles['formppk-referral-icon-hospital']} />
                        <span className={styles['formppk-referral-item-label']}>
                          {getTitleFromKey(key)}:
                        </span>
                       <span className={styles['formppk-referral-item-value']}>
                          {Array.isArray(clinic)
                            ? clinic.map((code: string) => clinicLabelMap[code] ?? code).join(', ')
                            : clinicLabelMap[clinic] ?? clinic}
                        </span>
                      </li>
                    );
                  })}
              </ul>


              <div className={styles['formppk-referral-actions']}>
                <button
                  className={styles['formppk-btn-confirm']}
                  onClick={(e) => {
                    e.preventDefault()
                    handleSave()
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการส่งต่อ'}
                </button>

                <button
                  type="button"
                  className={styles['formppk-btn-print']}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push('/printsummary');
                  }}
                  style={{ marginLeft: 8 }}
                >
                  พิมพ์แบบฟอร์ม
                </button>
              </div>
            </section>
          )}
      </form> 
     </motion.div>
    )
  }