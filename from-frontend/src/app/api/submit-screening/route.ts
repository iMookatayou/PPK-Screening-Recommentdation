// app/api/submit-screening/route.ts (Next.js 13+ App Router)
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { patient, screening, routing, timestamp } = body

    if (!patient || !screening || !routing) {
      return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // จำลองการบันทึกข้อมูล (เช่น ส่งเข้า DB หรือส่งต่อแผนก)
    console.log('📥 รับข้อมูลใหม่:', { patient, screening, routing, timestamp })

    // TODO: บันทึกจริงผ่านฐานข้อมูล หรือส่ง webhook ไปยังแต่ละแผนก

    return NextResponse.json({ message: 'บันทึกข้อมูลเรียบร้อย' }, { status: 200 })
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 })
  }
}
