// 'use client'

// import React, { useEffect, useState } from 'react'

// export default function OPDPage() {
//   const [latest, setLatest] = useState<any>(null)

//   useEffect(() => {
//     const saved = localStorage.getItem('latestCancerPatient')
//     if (saved) {
//       try {
//         setLatest(JSON.parse(saved))
//       } catch {
//         setLatest(null)
//       }
//     }
//   }, [])

//   if (!latest) {
//     return <div className="p-6 text-gray-500">ยังไม่มีผู้ป่วยที่ถูกส่งต่อ</div>
//   }

//   const { patient, results, timestamp } = latest

//   return (
//     <div className="p-6 space-y-4">
//       <h1 className="text-xl font-bold">ห้องตรวจ OPD ศัลยกรรม</h1>

//       <div className="bg-white p-4 rounded shadow space-y-1 text-sm">
//         <p><strong>ชื่อ-สกุล:</strong> {patient.prename} {patient.firstname} {patient.lastname}</p>
//         <p><strong>CID:</strong> {patient.citizencardno}</p>
//         <p><strong>วันเกิด:</strong> {patient.birthdatetime}</p>
//         <p><strong>ประเภทมะเร็ง:</strong> {patient.cancerHistory?.cancerType ?? '-'}</p>
//         <p><strong>บันทึกเมื่อ:</strong> {new Date(timestamp).toLocaleString()}</p>
//       </div>

//       <div className="bg-gray-50 p-4 rounded border text-sm">
//         <h2 className="font-semibold mb-2">ผลการตอบแบบสอบถาม</h2>
//         <ul className="list-disc ml-5 space-y-1">
//           {Object.entries(results).map(([key, val]) => (
//             <li key={key}>
//               ข้อ {key}: {JSON.stringify(val)}
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   )
// }
