'use client'

import React, { useEffect, useState } from 'react'
import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap'
import { getTitle } from '@/app/components/utils/getTitle'

export default function PrintFormPage() {
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [thaiIDData, setThaiIDData] = useState<any>(null)

  // Fetch data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('answers')
    const idData = localStorage.getItem('thaiIDData')
    if (stored) setAnswers(JSON.parse(stored))
    if (idData) setThaiIDData(JSON.parse(idData))
  }, [])

  // Calculate age from birth date
  const getAgeFromBirthDate = (birthDate?: string): string => {
    if (!birthDate || birthDate.length < 8) return 'ไม่ระบุ'
    const y = parseInt(birthDate.substring(0, 4)) - 543
    const m = parseInt(birthDate.substring(4, 6)) - 1
    const d = parseInt(birthDate.substring(6, 8))
    const birth = new Date(y, m, d)
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

  const handlePrint = () => {
    // Immediately trigger the print dialog
    window.print() // This will open the print dialog directly
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white p-6 rounded-lg shadow print:block text-sm">
      <h1 className="text-lg font-bold text-center mb-4">สรุปผลการคัดกรองผู้ป่วย</h1>

      {thaiIDData && (
        <div className="mb-4 text-gray-700">
          <p><strong>ชื่อ-สกุล:</strong> {thaiIDData.firstNameTh} {thaiIDData.lastNameTh}</p>
          <p><strong>อายุ:</strong> {getAgeFromBirthDate(thaiIDData.birthDate)}</p>
          <p><strong>เพศ:</strong> {thaiIDData.gender === '1' ? 'ชาย' : thaiIDData.gender === '2' ? 'หญิง' : 'ไม่ระบุ'}</p>
          <p><strong>สิทธิการรักษา:</strong> {thaiIDData.maininscl_name || 'ไม่ระบุ'}</p>
          <p><strong>วันที่เริ่มต้นสิทธิ:</strong> {thaiIDData.issueDate || 'ไม่ระบุ'}</p>
          <p><strong>วันหมดอายุสิทธิ:</strong> {thaiIDData.expiryDate || 'ไม่ระบุ'}</p>
        </div>
      )}

      <table className="w-full border border-gray-300 mb-6">
        <thead className="bg-gray-100">
          <tr className="text-left">
            <th className="border px-3 py-2 w-12">ข้อ</th>
            <th className="border px-3 py-2">คำถาม</th>
            <th className="border px-3 py-2">รายละเอียด</th>
            <th className="border px-3 py-2">ห้องตรวจ</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(answers).map(([key, data]) => {
            const qId = parseInt(key)
            const title = getTitle(qId)
            const note = data.note || '—'
            const clinic = clinicLabelMap[data.clinic] || data.clinic || 'ไม่ระบุ'

            return (
              <tr key={key} className="border-t">
                <td className="border px-3 py-2">{qId || 'ไม่ระบุ'}</td>
                <td className="border px-3 py-2">{title || 'ไม่ระบุ'}</td>
                <td className="border px-3 py-2">{note}</td>
                <td className="border px-3 py-2 font-semibold text-blue-700">{clinic}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex justify-center gap-4">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
        >
          พิมพ์แบบฟอร์มจริง
        </button>
      </div>
    </div>
  )
}
