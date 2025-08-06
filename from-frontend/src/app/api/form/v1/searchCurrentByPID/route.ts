import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(
  req: NextRequest,
  { params }: { params: { cid: string } }
) {
  const { cid } = params

  if (!cid || cid.length !== 13) {
    return NextResponse.json({ error: 'Invalid CID' }, { status: 400 })
  }

  const backendURL =
    process.env.NEXT_PUBLIC_FORM_API?.trim() !== ''
      ? `${process.env.NEXT_PUBLIC_FORM_API}/v1/searchCurrentByPID/${cid}`
      : 'http://localhost:5000/v1/searchCurrentByPID/' + cid

  try {
    const res = await fetch(backendURL, { cache: 'no-store' })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'ไม่สามารถเชื่อมต่อระบบสิทธิได้' },
        { status: res.status }
      )
    }

    const data = await res.json()
    const info = data?.data || {}

    if (!info.maininscl) {
      return NextResponse.json(
        {
          status: 'not_found',
          message: 'ไม่พบข้อมูลสิทธิของเลขบัตรประชาชนนี้ในระบบ',
          cid,
        },
        { status: 200 }
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
      raw: data,
    })
  } catch (err) {
    console.error('[API ERROR]', err)
    return NextResponse.json(
      {
        status: 'unreachable',
        message: 'ไม่สามารถเชื่อมต่อกับระบบสิทธิได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
      },
      { status: 504 }
    )
  }
}
