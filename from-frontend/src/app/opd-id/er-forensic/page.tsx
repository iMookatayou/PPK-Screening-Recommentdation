'use client'

import { useEffect } from 'react'

export default function ERConsultPage() {
  useEffect(() => {
    const data = localStorage.getItem('latestThaiIDPatient')
    if (data) {
      console.log('er รับข้อมูล:', JSON.parse(data))
      // TODO: ส่ง POST ไปยัง API หรือจัดการข้อมูลเพิ่มเติมได้ที่นี่
    }
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">ER Consult</h1>
      <p>หน้าสำหรับแสดงข้อมูลผู้ป่วยที่ส่งมายัง ER Consult</p>
    </div>
  )
}