import React from 'react'

import Question1 from './Question1_HandInjury'
import Question2 from './Question2_CSpineInjury'
import Question3 from './Question3_Cellulitis'
import Question4 from './Question4_AnimalBite'
import Question5 from './Question5_Thyroid'
import Question6 from './Question6_Urinary_Tract_Infection'
import Question7 from './Question7_Sick_in_the _lower _abdomen_found_a_lump'
import Question8 from './Question8_Stomach_ache'
import Question9 from './Question9_Case_Refer_OPDMED'
import Question10 from './Question10_Patients_with_criminal_or_physical_assault_cases'
import Question11 from './Question11_OSCC'
import Question12 from './Question12_Pregnancy'
import Question13 from './Question13_Patients_with_psychiatric_symptoms'
import Question14 from './Question14_Suspected_respiratory_tract_infection'
import Question15 from './Question15_Ludwig_s_angina'
import Question16 from './Question16_Keloid'
import Question17 from './Question17_Deep_vein_thrombosis'
import Question18 from './Question18_AVF_arteriovenous_fistula'
import Question19 from './Question19_Perm_cath'
import Question20 from './Question20_Clompartment_Syndrome'
import Question21 from './Question21_HIV'
import Question22 from './Question22_PEP'
import Question23 from './Question23_Lockjaw'
import Question24 from './Question24_Retain_foreign_body'
import Question25 from './Question25_Stroke_Onset_in72hrs'

// รวมทุก Question เป็น object เดียว
const allQuestionComponents = {
  Question1,
  Question2,
  Question3,
  Question4,
  Question5,
  Question6,
  Question7,
  Question8,
  Question9,
  Question10,
  Question11,
  Question12,
  Question13,
  Question14,
  Question15,
  Question16,
  Question17,
  Question18,
  Question19,
  Question20,
  Question21,
  Question22,
  Question23,
  Question24,
  Question25,
}

// เพิ่ม type เฉพาะเพื่อใช้เป็น key อย่างปลอดภัย
export type QuestionKey = keyof typeof allQuestionComponents

// สร้าง allQuestions ที่รองรับ index เป็น string และ component ใดๆ
const allQuestions = allQuestionComponents as Record<string, React.ComponentType<any>>

// export สำหรับใช้งาน
export default allQuestions
