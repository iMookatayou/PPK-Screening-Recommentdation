// app/api/rights/route.ts
import { NextRequest, NextResponse } from 'next/server'

/** ใช้ env ฝั่ง server ก่อน (FORM_API) แล้วค่อย fallback ไป NEXT_PUBLIC_FORM_API */
function getApiBase(): string {
  const a = (process.env.FORM_API || '').trim()
  if (a) return a
  const b = (process.env.NEXT_PUBLIC_FORM_API || '').trim()
  if (b) return b
  return 'http://localhost:5000' // สุดท้าย fallback local
}

/** join URL แบบปลอดภัยเรื่อง "/" */
function joinUrl(base: string, ...parts: Array<string | number>): string {
  const trimmed = [base.replace(/\/+$/, ''), ...parts.map(String).map(p => p.replace(/^\/+|\/+$/g, ''))]
  return trimmed.join('/')
}

/** แปลงวันที่ พ.ศ.รูปแบบ YYYYMMDD -> DD/MM/YYYY (ค.ศ.) */
function formatThaiDate(thaiDateStr?: string): string | null {
  if (!thaiDateStr || thaiDateStr.length !== 8) return null
  try {
    const yyyy = parseInt(thaiDateStr.slice(0, 4), 10) - 543
    const mm = thaiDateStr.slice(4, 6)
    const dd = thaiDateStr.slice(6, 8)
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const cid = (url.searchParams.get('cid') || '').trim()

  if (!cid || cid.length !== 13) {
    return NextResponse.json({ error: 'Invalid CID' }, { status: 400 })
  }

  const API_BASE = getApiBase()

  const endpoint = joinUrl(API_BASE, 'v1', 'searchCurrentByPID', cid)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // ถ้าต้องการ token เฉพาะ ใส่ได้ตรงนี้ เช่น:
        // Authorization: `Bearer ${process.env.NHSO_TOKEN}`
      },
    })

    const isJson = res.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await res.json().catch(() => ({})) : {}

    if (!res.ok) {
      clearTimeout(timeout)
      return NextResponse.json(
        { error: payload?.error || 'ไม่สามารถเชื่อมต่อระบบสิทธิได้' },
        { status: res.status },
      )
    }

    clearTimeout(timeout)

    const info = (payload as any)?.data ?? {}

    // กรณีไม่พบข้อมูล
    if (!info?.maininscl) {
      return NextResponse.json(
        {
          status: 'not_found',
          message: 'ไม่พบข้อมูลสิทธิของเลขบัตรประชาชนนี้ในระบบ',
          cid,
        },
        { status: 200 },
      )
    }

    return NextResponse.json({
      status: 'success',
      cid,
      hn: info.hn?.trim?.() || null,
      insuranceCode: info.maininscl || null,
      insuranceType: info.maininscl_name?.trim?.() || null,
      registeredHospital: info.hmain_name?.trim?.() || null,
      subHospital: info.hsub_name?.trim?.() || null,
      startDate: formatThaiDate(info.startdate),
      expDate: formatThaiDate(info.expdate),
      address: {
        houseNo: info.houseNo?.trim?.() || '',
        moo: info.moo?.trim?.() || '',
        tambon: info.tambon?.trim?.() || '',
        amphur: info.amphur?.trim?.() || '',
        province: info.province?.trim?.() || '',
      },
      raw: payload,
    })
  } catch (err) {
    clearTimeout(timeout)
    console.error('[API ERROR]', err)
    const aborted = (err as any)?.name === 'AbortError'
    return NextResponse.json(
      {
        status: aborted ? 'timeout' : 'unreachable',
        message: aborted
          ? 'เชื่อมต่อระบบสิทธิเกินเวลา โปรดลองใหม่'
          : 'ไม่สามารถเชื่อมต่อกับระบบสิทธิได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
      },
      { status: 504 },
    )
  }
}
