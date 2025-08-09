// app/components/questionpath/utils/getTitle.ts
export const getTitle = (id: number): string => {
  switch (id) {
    case 1: return 'บาดเจ็บที่มือ (Hand Injury)'
    case 2: return 'บาดเจ็บที่คอ (Cervical Spine Injury)'
    case 3: return 'แมลงสัตว์กัดต่อย / การติดเชื้อที่ผิวหนัง (Insect Bite or Cellulitis)'
    case 4: return 'สัตว์กัด (Animal Bite)'
    case 5: return 'ต่อมไทรอยด์ผิดปกติ (Thyroid Disorder)'
    case 6: return 'การติดเชื้อทางเดินปัสสาวะ (Urinary Tract Infection - UTI)'
    case 7: return 'ปวดท้องน้อย / พบก้อน (Lower Abdominal Pain / Palpable Mass)'
    case 8: return 'ปวดท้อง (Abdominal Pain)'
    case 9: return 'มาตามนัด / ก่อนหรือหลังนัด OPD MED (Follow-up / Walk-in Before or After OPD MED Appointment)'
    case 10: return 'ผู้ป่วยคดี / ทำร้ายร่างกาย (Medico-Legal Case / Assault Injury)'
    case 11: return 'ผู้ป่วยมะเร็งช่องปาก (OSCC Patient)'
    case 12: return 'ตั้งครรภ์ (Pregnancy)'
    case 13: return 'มีอาการทางจิตเวช (Psychiatric Symptoms)'
    case 14: return 'สงสัยติดเชื้อระบบทางเดินหายใจ (Suspected Respiratory Infection)'
    case 15: return 'ฝีลึกบริเวณใต้คาง (Ludwig’s Angina)'
    case 16: return 'แผลคีลอยด์ (Keloid Scar)'
    case 17: return 'ภาวะลิ่มเลือดดำลึก (Deep Vein Thrombosis - DVT)'
    case 18: return 'แผลบริเวณจุดต่อเส้นฟอกไต (AVF Wound)'
    case 19: return 'แผลจากสายฟอกเลือด (Perm Cath Wound)'
    case 20: return 'ภาวะกล้ามเนื้อบวมในช่องจำกัด (Compartment Syndrome)'
    case 21: return 'สงสัยติดเชื้อ HIV / สัมผัสเสี่ยง (Suspected HIV / High-Risk Exposure)'
    case 22: return 'การประเมินเพื่อให้ยาป้องกัน (PEP Evaluation - Healthcare Exposure to HIV)'
    case 23: return 'ขากรรไกรค้าง (Temporomandibular Joint Lock - Lockjaw)'
    case 24: return 'มีสิ่งแปลกปลอมในร่างกาย (Retained Foreign Body)'
    case 25: return 'โรคหลอดเลือดสมองภายใน 72 ชม. (Stroke: Within 72 Hours)'
    case 26: return 'อื่น ๆ (Other)'
    default: return 'หัวข้อที่ยังไม่ระบุ (Unspecified Category)'
    }
}

