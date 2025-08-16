// utils/userStatusPopupMapper.tsx
'use client'

import React from 'react'
import { AlertTriangle, CheckCircle, ShieldAlert, Info } from 'lucide-react'

/** ---------- Types: API payload from Backend ---------- */
export type ApiAction = { key: 'REAPPLY'|'CONTACT'|'LOGIN'|'CLOSE'; label: string; url?: string }
export type ApiResponse = {
  code:
    | 'ALLOW_REAPPLY'
    | 'CONTACT_ADMIN'
    | 'BLOCK_REAPPLY'
    | 'REJECTED'
    | 'REJECTED_UPDATED'
    | 'APPROVED'
    | 'NO_OP'
    | 'INVALID_STATUS'
    | 'SELF_ACTION_FORBIDDEN'
    | 'UNAUTHENTICATED'
    // from Register flow
    | 'ALREADY_REGISTERED'
    | 'PENDING_EXISTING'
    | 'REGISTERED_PENDING'
  message: string
  reason?: string | null
  user_hint?: string | null
  reapply_until?: string | null
  actions?: ApiAction[]
}

/** ---------- Types: ReusablePopup props ---------- */
export type PopupVariant = 'info' | 'success' | 'warning' | 'danger'
type PopupAction = { label: string; onClick: () => void }

export type PopupPropsMapped = {
  title: string
  message: React.ReactNode
  variant: PopupVariant
  reason?: string
  hint?: string
  deadline?: string
  primary?: PopupAction
  secondary?: PopupAction
}

/** ---------- Icons & Titles & Variants ---------- */
const iconByCode: Record<ApiResponse['code'], React.ReactNode> = {
  APPROVED:              <CheckCircle className="w-5 h-5" />,
  REJECTED:              <ShieldAlert className="w-5 h-5" />,
  REJECTED_UPDATED:      <Info className="w-5 h-5" />,
  ALLOW_REAPPLY:         <Info className="w-5 h-5" />,
  BLOCK_REAPPLY:         <AlertTriangle className="w-5 h-5" />,
  CONTACT_ADMIN:         <Info className="w-5 h-5" />,
  NO_OP:                 <Info className="w-5 h-5" />,
  INVALID_STATUS:        <AlertTriangle className="w-5 h-5" />,
  SELF_ACTION_FORBIDDEN: <ShieldAlert className="w-5 h-5" />,
  UNAUTHENTICATED:       <AlertTriangle className="w-5 h-5" />,
  // --- Register flow
  ALREADY_REGISTERED:    <AlertTriangle className="w-5 h-5" />,
  PENDING_EXISTING:      <Info className="w-5 h-5" />,
  REGISTERED_PENDING:    <CheckCircle className="w-5 h-5" />,
}

const titleByCode: Record<ApiResponse['code'], string> = {
  APPROVED:              'อนุมัติสำเร็จ',
  REJECTED:              'ปฏิเสธคำขอ',
  REJECTED_UPDATED:      'อัปเดตเหตุผลแล้ว',
  ALLOW_REAPPLY:         'กรุณาสมัครใหม่',
  BLOCK_REAPPLY:         'บล็อกการสมัครใหม่',
  CONTACT_ADMIN:         'โปรดติดต่อแอดมิน',
  NO_OP:                 'ดำเนินการแล้ว',
  INVALID_STATUS:        'สถานะไม่สอดคล้อง',
  SELF_ACTION_FORBIDDEN: 'ไม่ได้รับอนุญาต',
  UNAUTHENTICATED:       'ต้องเข้าสู่ระบบ',
  // --- Register flow
  ALREADY_REGISTERED:    'เลขบัตรนี้ถูกใช้งานแล้ว',
  PENDING_EXISTING:      'มีคำขอรออนุมัติอยู่',
  REGISTERED_PENDING:    'สมัครสำเร็จ กำลังรออนุมัติ',
}

const variantByCode: Record<ApiResponse['code'], PopupVariant> = {
  APPROVED:              'success',
  REJECTED:              'danger',
  REJECTED_UPDATED:      'info',
  ALLOW_REAPPLY:         'warning',
  BLOCK_REAPPLY:         'danger',
  CONTACT_ADMIN:         'info',
  NO_OP:                 'info',
  INVALID_STATUS:        'info',
  SELF_ACTION_FORBIDDEN: 'danger',
  UNAUTHENTICATED:       'warning',
  // --- Register flow
  ALREADY_REGISTERED:    'warning',
  PENDING_EXISTING:      'info',
  REGISTERED_PENDING:    'success',
}

/** ---------- Action runner ---------- */
export type RunAction = (a?: ApiAction) => void

/** ---------- Main: factory ---------- */
export function makeUserStatusPopupMapper(run: RunAction) {
  return function mapUserStatusResponseToPopup(res: ApiResponse): PopupPropsMapped {
    const [p, s] = res.actions ?? []

    const message = (
      <div className="flex items-start gap-2">
        <span aria-hidden>{iconByCode[res.code]}</span>
        <span className="text-sm text-slate-700">{res.message}</span>
      </div>
    )

    return {
      title: titleByCode[res.code] ?? 'แจ้งเตือนระบบ',
      variant: variantByCode[res.code] ?? 'info',
      message,
      reason: res.reason ?? undefined,
      hint: res.user_hint ?? undefined,
      deadline: res.reapply_until ?? undefined,
      primary: p ? { label: p.label, onClick: () => run(p) } : undefined,
      secondary: s ? { label: s.label, onClick: () => run(s) } : undefined,
    }
  }
}

/** ---------- Default runner พร้อม logout (ออปชัน) ---------- */
export function createDefaultPopupActionRunner(
  routerPush: (url: string) => void,
  logout?: () => void
): RunAction {
  return (a?: ApiAction) => {
    if (!a) return

    switch (a.key) {
      case 'REAPPLY':
        // เคสให้สมัครใหม่: ล้าง session ก่อนเพื่อเข้าหน้า /register ได้สะอาด ๆ
        if (logout) logout()
        if (a.url) routerPush(a.url)
        break
      case 'LOGIN':
        if (a.url) routerPush(a.url)
        break
      case 'CONTACT':
        if (a.url) window.open(a.url, '_blank')
        break
      case 'CLOSE':
      default:
        // ให้ popup component ปิดเอง
        break
    }
  }
}
