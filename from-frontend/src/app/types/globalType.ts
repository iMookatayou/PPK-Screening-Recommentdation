// types/globalType.ts

// ชนิดข้อมูลตัวเลือก (ใช้กับ react-select)
export type OptionType = {
  value: string;
  label: string;
};

// ชนิดข้อมูลคำถาม (รองรับ options หลายตัวเลือก)
export type QuestionType = {
  value: number;
  options: OptionType[];
};

export type ThaiIDAddress = {
  Full?: string;
  HouseNo?: string;  
  Tumbol?: string;
  Amphur?: string;
  Province?: string;
  Moo?: string;
};

// ข้อมูลผู้ป่วย (เก็บในฟอร์ม)
export type PatientData = {
  cid: string;
  titleNameTh: string;
  firstNameTh: string;
  lastNameTh: string;
  birthDate: string;
  age?: string;  
  gender: string;
  address?: ThaiIDAddress; 
  issueDate: string;  
  expiryDate: string; 
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

// ข้อมูลจาก ThaiID (อ่านจากเครื่องอ่านบัตร)
export type ThaiIDData = {
  titleNameTh?: string;
  firstNameTh?: string;
  lastNameTh?: string;
  birthDate?: string;
  gender?: string;
  cid?: string;
  address?: ThaiIDAddress; 
  issueDate?: string;
  expiryDate?: string;
  photo?: string;
  primary_province_name?: string;
  primary_amphur_name?: string;
  primary_tumbon_name?: string;
  primary_mooban_name?: string;
};

export type GlobalQuestionResult = {
  clinic: string;              // แผนกที่ระบบจะ route ไป
  note?: string;               // รายละเอียดเพิ่มเติม
  routedBy: 'auto' | 'manual'; // การตัดสินใจถูกคัดกรองอัตโนมัติหรือไม่
  caseType?: string;           // ระบุประเภทเคส (เช่น Stroke, DVT, HIV)
  isReferCase?: boolean;       // ระบุว่าเป็น case refer หรือไม่
  // isAfterHours?: boolean;      // สำหรับเคสที่มีเงื่อนไขเวลา (เช่น PEP)
  // vitalStable?: boolean;       // สำหรับ stroke หรือเคสอื่นที่ใช้ VS
  // onsetCategory?: string;      // สำหรับ stroke: 'within72', '72to14d', 'over14d'
  selectedSymptoms?: string[]; // สำหรับ DVT หรือกลุ่ม symptom-based
  // customNote?: string;         // กรณี note ถูกแยกออกจาก symptom
  // [key: string]: any;          // รองรับ field เพิ่มเติมแบบ flexible
}