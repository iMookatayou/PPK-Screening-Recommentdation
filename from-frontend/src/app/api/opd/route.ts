// /app/api/opd-exam/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()

  // ทำ logic ที่ต้องการ เช่น save ไป DB, mock store, หรือ push เข้าคิว
  console.log('ส่งต่อผู้ป่วยไป OPD:', body)

  return NextResponse.json({ success: true })
}
