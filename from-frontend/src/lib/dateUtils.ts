// src/lib/dateUtils.ts

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// โหลด plugin เพียงครั้งเดียว
dayjs.extend(utc)
dayjs.extend(timezone)

export const THAI_TZ = 'Asia/Bangkok'

/**
 * ใช้ dayjs แบบ fix timezone ไทย
 */
export const dayjsThai = () => dayjs().tz(THAI_TZ)

/**
 * คืนค่าหมายเลขวันตามเวลาไทย (0 = อาทิตย์, 1 = จันทร์, ..., 6 = เสาร์)
 */
export const getThaiDayNumber = (): number => {
  return dayjsThai().day()
}

/**
 * คืนชื่อวันภาษาไทย เช่น "พฤหัสบดี"
 */
export const getThaiDayName = (): string => {
  const names = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  return names[getThaiDayNumber()]
}

/**
 * ตรวจสอบว่าเป็นวันให้บริการ Keloid (จันทร์หรือพฤหัส)
 */
export const isAllowableKeloidDay = (): boolean => {
  const d = getThaiDayNumber()
  return d === 1 || d === 4
}

/**
 * ตรวจสอบว่าเป็นวันอนุญาตตาม index ที่กำหนด
 * @param allowedDays เช่น [1, 4] = จันทร์, พฤหัส
 */
export const isAllowedThaiDay = (allowedDays: number[]): boolean => {
  const today = getThaiDayNumber()
  return allowedDays.includes(today)
}
