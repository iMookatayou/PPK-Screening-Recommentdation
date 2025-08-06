import { NextRequest, NextResponse } from 'next/server'

const mockDB = new Map<string, string>() // ใช้แทนฐานข้อมูลจริง

export async function POST(req: NextRequest) {
  const { cid, password } = await req.json()

  if (!cid || !password) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบ' }, { status: 400 })
  }

  if (mockDB.has(cid)) {
    return NextResponse.json({ message: 'ผู้ใช้นี้มีอยู่แล้ว' }, { status: 409 })
  }

  mockDB.set(cid, password) // บันทึกรหัสผ่านแบบ plain-text (ไม่แนะนำในโปรดักชัน)

  return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ' }, { status: 200 })
}

