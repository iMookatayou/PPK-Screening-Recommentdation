// app/opd-id/ortho/page.tsx
'use client'

import { useEffect } from 'react'

export default function PsychPage() {
  useEffect(() => {
    const data = localStorage.getItem('latestThaiIDPatient')
    if (data) {
      console.log('OPD Ortho รับข้อมูล:', JSON.parse(data))
      // TODO: ส่ง POST ไปยัง API หรือจัดการข้อมูลเพิ่มเติมได้ที่นี่
    }
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">OPD จิตเวช</h1>
      <p>หน้าสำหรับแสดงข้อมูลผู้ป่วยที่ส่งมายัง OPD จิตเวช</p>
    </div>
  )
}
