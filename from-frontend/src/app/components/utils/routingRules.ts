import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'

export interface AnswerData {
  clinic?: string | string[]
  clinic1?: string | string[]
  clinic2?: string | string[]
  referToClinic?: string | string[]
  isReferCase?: boolean
  gender?: '1' | '2' | '3'
  hasProstateIssue?: boolean
  hasUrinaryRetention?: boolean
  timeOfDay?: 'morning' | 'afternoon'
  pregnancyType?: string
  referBySelf?: string[]
  [key: string]: any
}

export type AnswersMap = Record<number, AnswerData>

const extractClinicsFromAnswer = (answer: AnswerData): string[] => {
  const keys = ['clinic', 'clinic1', 'clinic2', 'referToClinic', 'referBySelf']
  const result: string[] = []

  for (const key of keys) {
    const value = answer[key]
    if (typeof value === 'string') {
      result.push(value)
    } else if (Array.isArray(value)) {
      result.push(...value.filter((v): v is string => typeof v === 'string'))
    }
  }

  return result
}

export const checkRouting = (answers: AnswersMap): string[] => {
  const clinicSet = new Set<string>()

  const q6 = answers[6]
  if (q6 && q6.gender) {
    const now = new Date()
    const isTueOrThu = [2, 4].includes(now.getDay()) // Tue or Thu
    const isMorning = now.getHours() < 12

    if (q6.gender === '3') {
      extractClinicsFromAnswer(q6).forEach((c) => clinicSet.add(c))
    } else if (isTueOrThu && isMorning) {
      clinicSet.add('uro')
    } else if (q6.gender === '2') {
      clinicSet.add('muang')
    } else {
      clinicSet.add('surg')
    }
  }

  const q12 = answers[12]
  if (q12?.pregnancyType === 'preeclampsia' || q12?.pregnancyType === 'bleeding') {
    clinicSet.add('lr')
  } else if (q12?.pregnancyType === 'anc') {
    clinicSet.add('anc')
  } else if (q12?.pregnancyType === 'other') {
    clinicSet.add('obgy')
  }

  Object.values(answers).forEach((answer) => {
    if (answer && typeof answer === 'object') {
      extractClinicsFromAnswer(answer).forEach((clinic) => clinicSet.add(clinic))
    }
  })

  if (clinicSet.size === 0) {
    clinicSet.add('surg')
  }

  return [...clinicSet]
}

export const getClinicLabels = (clinicCodes: string[]): string[] => {
  return clinicCodes.map((code) => clinicLabelMap[code] || `ไม่ทราบ (${code})`)
}
