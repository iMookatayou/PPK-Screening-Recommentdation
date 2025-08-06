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
  import { useToast } from '@/app/components/ui/ToastProvider'
  import { v4 as uuidv4 } from 'uuid'
  import type { PatientData } from '@/app/types/globalType'

  export default function FormContent() {
    const { data: thaiIDData, resetData } = useThaiID() // ใช้ resetData เพื่อล้างข้อมูลจาก context
    const router = useRouter() // ใช้ router เพื่อรีเฟรชหน้า

    const [manualData, setManualData] = useState<PatientData>({
      cid: '',
      titleNameTh: '',
      firstNameTh: '',
      lastNameTh: '',
      birthDate: '',
      gender: '',
      address: {
        Full: '',
        Tumbol: '',
        Amphur: '',
        Province: '',
        Moo: ''
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

    type QuestionResult = {
      case_id: string;
      question_key: string;
      clinic: string | null;
      is_refer_case: boolean;
      note?: string;
      symptoms?: string[];
      answers?: Record<string, any>;
      routed_by?: any;
      created_at: string;
    };

    type QuestionResultWithMeta = QuestionResult & {
      question: string;
      question_code: number;
      question_title: string;
      isReferCase: boolean;
    };

    const Questions = allQuestionsRaw as Record<
      string,
      React.ComponentType<{ onResult: (result: any) => void; type?: string }>
    >

    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
    const [selectedQuestionKeys, setSelectedQuestionKeys] = useState<string[]>([])
    const [questionResults, setQuestionResults] = useState<Record<string, QuestionResult>>({})
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [routingClinics, setRoutingClinics] = useState<string[]>([])
    const [showConfirm, setShowConfirm] = useState(false)
    const [finished, setFinished] = useState(false)
    const { refreshCardData } = useThaiID();
    const [showCheckmark, setShowCheckmark] = useState(false)
    const hasShownToastRef = useRef(false)
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast()

    useEffect(() => {
      setSelectedQuestionKeys(selectedQuestions)
    }, [selectedQuestions])

    const questionOptions = Object.keys(Questions).map((key, index) => ({
      value: key,
      label: `ข้อที่ ${index + 1}: ${getTitle(index + 1)}`
    }))

    function getTitleFromKey(key: string): string {
      const match = key.match(/\d+/)
      if (!match) return ''
      const index = parseInt(match[0])
      return getTitle(index)
    }

    // 1. เมื่อมีการเปลี่ยน thaiIDData → เซต manualData + เรียก FrontAgent + ดึงสิทธิ
    useEffect(() => {
      if (!thaiIDData?.cid) return;

      const baseUrl = process.env.NEXT_PUBLIC_FORM_API;
      const cardUrl = process.env.NEXT_PUBLIC_CARD_API || 'http://localhost:5000';

      // Step 1: Reset data
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
          Moo: ''
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
      });

      setSelectedQuestions([]);
      setSelectedQuestionKeys([]);
      setQuestionResults({});
      setAnswers({});
      setFinished(false);

      // Step 2: ดึง cid จาก FrontAgent
      fetch(`${cardUrl}/get_cid_data?callback=cb&section1=true&section2a=true&section2c=true`)
        .then(res => res.text())
        .then(text => {
          const jsonText = text.replace(/^\/\*\*\/cb\((.*)\);$/, '$1');
          const data = JSON.parse(jsonText);
          const cid = data.CitizenID;

          setManualData(prev => ({
            ...prev,
            cid,
            titleNameTh: data.TitleNameTh || '',
            firstNameTh: data.FirstNameTh || '',
            lastNameTh: data.LastNameTh || '',
            birthDate: data.BirthDate || '',
            gender: data.Gender || '',
            photo: data.PhotoBase64 || '',
            address: {
              Full: data.Full || '',
              HouseNo: data.HouseNo || '', 
              Tumbol: data.Tumbol || '',
              Amphur: data.Amphur || '',
              Province: data.Province || '',
              Moo: data.Moo || ''
            }
          }));

          // Step 3: ดึงสิทธิ
          if (!baseUrl) return;

          fetch(`${baseUrl}/v1/searchCurrentByPID/${cid}`)
            .then(res => res.json())
            .then(result => {
              const info = result?.data;
              if (!info) return;

              const toDate = (val?: string) => {
                if (!val || val.length !== 8) return '';
                const y = parseInt(val.slice(0, 4), 10) - 543;
                const m = val.slice(4, 6);
                const d = val.slice(6, 8);
                return `${y}-${m}-${d}`;
              };

              setManualData(prev => ({
                ...prev,
                maininscl_name: info.maininscl_name || '',
                hmain_name: info.hmain_name || '',
                hsub_name: info.hsub_name || '',
                issueDate: toDate(info.startdate),
                expiryDate: toDate(info.expdate),
              }));
            })
            .catch(err => console.error('❌ Fetch NHOS rights error:', err));
        })
        .catch(err => {
          console.error('❌ Fetch FrontAgent error:', err);
          addToast({
            type: 'error',
            icon: <AlertCircle size={20} />,
            message: 'อ่านบัตรไม่สำเร็จ หรือไม่พบข้อมูล',
            position: 'top-right'
          });
        });
    }, [thaiIDData]);

    // ฟังก์ชันเพื่อให้ฟอร์มล้างข้อมูล
    const handleClearForm = () => {
      resetData() // รีเซ็ตข้อมูลใน context
      setManualData({
        cid: '',
        titleNameTh: '',
        firstNameTh: '',
        lastNameTh: '',
        birthDate: '',
        gender: '',
        address: {
          Full: '',
          Tumbol: '',
          Amphur: '',
          Province: '',
          Moo: ''
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
      // รีเฟรชหน้าเพื่อตั้งค่าการอ่านบัตรใหม่
      router.refresh() // รีเฟรชหน้าเพื่อให้ `useEffect` ของ ThaiIDProvider ทำงานใหม่
    }

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setManualData({ ...manualData, [field]: value })
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
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      age--
    }

    return isNaN(age) ? 'ไม่ระบุ' : age.toString()
  }

  const formatDateForInput = (raw: string, isBirthDate: boolean = false): string => {
    if (!raw) return '';

    // รูปแบบ yyyy-mm-dd อยู่แล้ว
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    // รูปแบบ 8 หลัก เช่น 25470323 หรือ 20040323
    if (/^\d{8}$/.test(raw)) {
      let yyyy = parseInt(raw.substring(0, 4), 10);
      const mm = raw.substring(4, 6);
      const dd = raw.substring(6, 8);
      return `${yyyy}-${mm}-${dd}`;
    }

    // รูปแบบ dd/mm/yyyy
    if (raw.includes('/')) {
      const [dd, mm, yy] = raw.split('/');
      let yyyy = parseInt(yy, 10);
      return `${yyyy}-${mm}-${dd}`;
    }

    return raw;
  };

  const handleQuestionAnswer = (key: string, answer: any) => {
    const newAnswers = { ...answers, [key]: answer }
    setAnswers(newAnswers)
    const result = checkRouting(newAnswers)
    setRoutingClinics(result)
    setShowConfirm(result.length > 0)
  }

  const patientInfo = manualData

  const handleSave = async () => {
    if (hasShownToastRef.current || isLoading) return;
    hasShownToastRef.current = true;
    setIsLoading(true);

    if (!manualData.cid || !/^\d{13}$/.test(manualData.cid)) {
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: 'เลขบัตรประชาชนไม่ถูกต้อง',
        position: 'top-right'
      });
      return;
    }

    if (!manualData.firstNameTh?.trim() || !manualData.lastNameTh?.trim()) {
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: 'กรุณากรอกชื่อ-นามสกุลให้ครบ',
        position: 'top-right'
      });
      return;
    }

    if (selectedQuestions.length === 0) {
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: 'กรุณาเลือกหัวข้อคำถามอย่างน้อย 1 ข้อ',
        position: 'top-right'
      });
      return;
    }

    try {
      // ตรวจสอบ Base URL
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) throw new Error('NEXT_PUBLIC_API_BASE_URL ไม่ถูกตั้งค่าใน .env');

      // STEP 1: Validate token
      const token = localStorage.getItem('token');
      if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล');

      // STEP 2: Get user info
      const meRes = await fetch(`${baseUrl}/api/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });

      if (!meRes.ok) {
        const error = await meRes.json();
        throw new Error(error.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งาน');
      }

      const me = await meRes.json();
      const routedBy = me.display_name || me.username || me.name || 'unknown';

      // STEP 3: Generate case ID
      const caseId = uuidv4();
      const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // STEP 4: Prepare question results
      const resultsToSave = Object.entries(questionResults).map(([key, result]) => {
        const safeSymptoms = Array.isArray(result.symptoms)
          ? result.symptoms
          : result.symptoms !== undefined
          ? [String(result.symptoms)]
          : [];

        return {
          case_id: caseId,
          question_key: key,
          clinic: result.clinic || null,
          is_refer_case: result.is_refer_case ?? false,
          note: result.note || '',
          symptoms: safeSymptoms,
          answers: result.answers || {},
          routed_by: routedBy,
          created_at: formattedDate
        };
      });

      // STEP 5: Validate patient data
      if (!manualData?.cid) throw new Error('กรุณากรอกเลขบัตรประชาชน');
      if (!manualData?.firstNameTh) throw new Error('กรุณากรอกชื่อผู้ป่วย');

      // STEP 5.5: เพิ่มข้อมูล meta
      const questionResultsWithMeta: QuestionResultWithMeta[] = resultsToSave.map((result, index) => {
        const title = getTitleFromKey(result.question_key) || `คำถาม ${index + 1}`;
        return {
          ...result,
          question: result.question_key,
          question_code: index + 1,
          question_title: title,
          isReferCase: result.is_refer_case ?? false
        };
      });

      // STEP 5.6: สรุปคลินิก + อาการ
      const summaryClinics = [
        ...new Set(questionResultsWithMeta.flatMap(q => q.clinic ? [q.clinic] : [])),
      ];

      const summarySymptoms =
        questionResultsWithMeta.length > 0
          ? [...new Set(questionResultsWithMeta.flatMap(q => q.symptoms ?? []))]
          : [];

      // STEP 6: Prepare payload
      const formattedBirthDate = formatDateForInput(manualData.birthDate);
      const age = getAgeFromBirthDate(formattedBirthDate);
      const parsedAge = isNaN(parseInt(age)) ? 0 : parseInt(age);

      const payload = {
        case_id: caseId,
        cid: manualData.cid.trim(),
        name: `${manualData.titleNameTh || ''}${manualData.firstNameTh || ''} ${manualData.lastNameTh || ''}`.trim(),
        age: parsedAge,
        gender: manualData.gender || '',
        maininscl_name: manualData.maininscl_name || '',
        hmain_name: manualData.hmain_name || '',
        created_at: formattedDate,
        issueDate: manualData.issueDate,
        expiryDate: manualData.expiryDate,
        summary_clinics: summaryClinics,
        symptoms: summarySymptoms.length > 0 ? summarySymptoms : ['ไม่มีอาการ'],
        question_results: questionResultsWithMeta,
      };

      // STEP 7: Send to API
      const saveRes = await fetch(`${baseUrl}/form-ppk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) {
        const errorDetails = await saveRes.json();
        throw new Error(JSON.stringify(errorDetails) || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      addToast({
        type: 'success',
        icon: <CheckCircle size={20} />,
        message: 'บันทึกข้อมูลสำเร็จ',
        position: 'top-right'
      });

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      addToast({
        type: 'error',
        icon: <AlertCircle size={20} />,
        message: errMsg,
        position: 'top-right'
      });
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* Popup checkmark ตอนอ่านบัตร */}
          {showCheckmark && (
            <motion.div
              className="checkmark-popup"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                zIndex: 9999,
                backgroundColor: '#ffffff',
                padding: '8px 12px',
                borderRadius: '25px',
                boxShadow: '0px 4px 6px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <CheckCircle className="inline w-6 h-6 text-green-600" />
              <span>บัตรประชาชนอ่านสำเร็จ</span>
            </motion.div>
          )}

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
                    value={manualData.age || getAgeFromBirthDate(manualData.birthDate)}
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
                  defaultValue={patientInfo.maininscl_name}
                  placeholder="สิทธิการรักษา"
                />
              </div>

              {/* หน่วยบริการต้น */}
                <div className="tight-row unit-field">
                  <label htmlFor="hmain_name">หน่วยบริการต้น:</label>
                  <input
                    id="hmain_name"
                    name="hmain_name"
                    defaultValue={patientInfo.hmain_name}
                    placeholder="โรงพยาบาลต้นสิทธิ"
                    readOnly
                  />
                </div>

                <div className="tight-row unit-field">
                  <label htmlFor="hsub_name">หน่วยบริการรอง:</label>
                  <input
                    id="hsub_name"
                    name="hsub_name"
                    defaultValue={patientInfo.hsub_name}
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 className={styles['formppk-btn-clear-icon']} />
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
                      onResult={(result: any) => {
                        setQuestionResults(prev => ({
                          ...prev,
                          [key]: {
                            ...result,
                            type: 'form', 
                          },
                        }))
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
              {Object.entries(questionResults).map(([key, result]) => (
                <li key={key} className={styles['formppk-referral-item']}>
                  <Hospital className={styles['formppk-referral-icon-hospital']} />
                  <span className={styles['formppk-referral-item-label']}>{getTitleFromKey(key)}:</span>
                  <span className={styles['formppk-referral-item-value']}>
                    {clinicLabelMap[result?.clinic ?? ''] ?? result?.clinic ?? 'ไม่ระบุ'}
                  </span>
                </li>
              ))}
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
                {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการส่งต่อและพิมพ์แบบฟอร์ม'}
              </button>
            </div>
          </section>
        )}

      </form>
     </motion.div>
    )
  }