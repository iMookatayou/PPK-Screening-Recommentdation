// ---------- Select types ----------
export type OptionType = {
  value: string;
  label: string;
};

export type QuestionType = {
  value: number;
  options: OptionType[];
};

// ---------- Thai ID / Address ----------
export type ThaiIDAddress = {
  Full: string;
  HouseNo?: string;
  Tumbol: string;
  Amphur: string;
  Province: string;
  Moo: string;
};

// ข้อมูลจากเครื่องอ่านบัตร (บางฟิลด์อาจไม่มี → optional)
export type ThaiIDData = {
  titleNameTh?: string;
  firstNameTh?: string;
  lastNameTh?: string;
  birthDate?: string;    // yyyyMMdd หรือ yyyy-MM-dd
  gender?: '1' | '2' | '3' | string;
  cid?: string;
  address?: Partial<ThaiIDAddress>;
  issueDate?: string;    // yyyy-MM-dd
  expiryDate?: string;   // yyyy-MM-dd
  photo?: string;
  primary_province_name?: string;
  primary_amphur_name?: string;
  primary_tumbon_name?: string;
  primary_mooban_name?: string;
};

// ---------- Patient in form ----------
export type PatientData = {
  cid: string;
  titleNameTh: string;
  firstNameTh: string;
  lastNameTh: string;
  birthDate: string;           // yyyy-MM-dd
  age?: number | string;       // บางที่คำนวณใน UI → string ก็ได้
  gender: '1' | '2' | '3' | string;
  address: ThaiIDAddress;      // ให้เป็น object แน่นอน ลด ?. ใน JSX
  issueDate: string;           // yyyy-MM-dd
  expiryDate: string;          // yyyy-MM-dd
  photo?: string;
  hn?: string;
  maininscl_name?: string;
  hmain_name?: string;
  hsub_name?: string;
  primary_province_name?: string;
  primary_amphur_name?: string;
  primary_tumbon_name?: string;
  primary_mooban_name?: string;
};

// ---------- Result model (generic) ----------
export type GlobalQuestionResult = {
  clinic: string[]             // รหัสแผนกที่ route ไป (เช่น 'med', 'er' ฯลฯ)
  note?: string;
  routedBy: 'auto' | 'manual';
  caseType?: string;
  isReferCase?: boolean;
  selectedSymptoms?: string[];
};

// ---------- FormPPK: โครงสร้างผลลัพธ์ที่ "คอมโพเนนต์คำถาม" ส่งกลับมา (Draft) ----------
export type FormDraft = {
  clinic: string[]       // ← แก้ให้รองรับทั้งเดี่ยวและ array
  symptoms?: string[] | string;
  note?: string;
  is_refer_case?: boolean;
};

// ---------- FormPPK: โครงสร้างผลลัพธ์ที่ "บันทึกจริง" (พร้อม metadata) ----------
export type QuestionResult = {
  case_id: string
  question_key: string
  clinic: string[]
  is_refer_case: boolean
  note: string
  symptoms: string[]
  routed_by: string
  created_at: string
  type: string
}

// ---------- พร้อมข้อมูลแสดงผล (title, code, etc.) ----------
export type QuestionResultWithMeta = QuestionResult & {
  question: string;
  question_code: number;
  question_title: string;
  type: string 
  isReferCase?: boolean;
};

// ---------- API payloads ----------
export type FormPPKPayload = {
  case_id: string;
  cid: string;
  name: string;
  age: number;
  gender: string;
  maininscl_name?: string;
  hmain_name?: string;
  created_at: string;   // 'YYYY-MM-DD HH:mm:ss'
  issueDate?: string;   // 'YYYY-MM-DD'
  expiryDate?: string;  // 'YYYY-MM-DD'
  summary_clinics: string[];   
  symptoms: string[];
  question_results: QuestionResultWithMeta[];
};

// สำหรับหน้า Guidance (ไม่เก็บผู้ป่วยจริง)
export type ReferralGuidancePayload = {
  patient_id: string;          // ex. 'anonymous-xxxx'
  selected_questions: string[];
  question_results: Array<{
    question: string;
    question_code: number;
    question_title: string;
    clinic: string[];          // guidance อนุญาตหลายห้อง
    symptoms: string[];
    note?: string;
    is_refer_case: boolean;
    type: 'guide';
    routed_by: string;
    created_at: string;
  }>;
  summary_clinics: string[];
  summary_symptoms: string[];
};
