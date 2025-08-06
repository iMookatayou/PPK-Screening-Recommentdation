import { NextRequest, NextResponse } from 'next/server'

const mockDB = new Map<string, string>() // จำลองฐานข้อมูล

export async function POST(req: NextRequest) {
  const { cid, newPassword } = await req.json()

  if (!mockDB.has(cid)) {
    return NextResponse.json({ message: 'ไม่พบผู้ใช้นี้' }, { status: 404 })
  }

  mockDB.set(cid, newPassword)
  return NextResponse.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' })
}
