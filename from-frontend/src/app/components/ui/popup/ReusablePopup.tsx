'use client'

import { Dialog } from '@headlessui/react'
import { motion } from 'framer-motion'
import React, { ReactNode, useEffect, useMemo, useState } from 'react'

type Color = 'red' | 'yellow' | 'blue' | 'green'

interface ReusablePopupProps {
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  title: string
  message: ReactNode
  icon?: ReactNode
  color?: Color
  reason?: string
  autoCloseMs?: number
  confirmText?: string
}

const colorClasses: Record<Color, { border: string; text: string; bg: string }> = {
  red:    { border: 'border-red-600',    text: 'text-red-600',    bg: 'bg-red-600' },
  yellow: { border: 'border-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500' },
  blue:   { border: 'border-blue-500',   text: 'text-blue-500',   bg: 'bg-blue-500' },
  green:  { border: 'border-green-600',  text: 'text-green-600',  bg: 'bg-green-600' },
}

export default function ReusablePopup({
  open,
  isOpen,
  onClose,
  title,
  message,
  icon,
  color = 'blue',
  reason,
  autoCloseMs,
  confirmText = 'ปิด',
}: ReusablePopupProps) {
  const actuallyOpen = typeof open === 'boolean' ? open : !!isOpen
  const colors = colorClasses[color]

  const [remain, setRemain] = useState<number | null>(
    typeof autoCloseMs === 'number' && autoCloseMs > 0 ? autoCloseMs : null
  )

  useEffect(() => {
    if (!actuallyOpen || !remain) return
    const started = Date.now()
    const id = setInterval(() => {
      const left = Math.max(0, (autoCloseMs as number) - (Date.now() - started))
      setRemain(left)
      if (left <= 0) {
        clearInterval(id)
        onClose()
      }
    }, 200)
    return () => clearInterval(id)
  }, [actuallyOpen, remain, autoCloseMs, onClose])

  const seconds = useMemo(() => (remain != null ? Math.ceil(remain / 1000) : null), [remain])

  return (
    <Dialog open={actuallyOpen} onClose={onClose}>
      {/* ดันทั้ง block ขึ้น z สูงกว่า topbar/side bar */}
      <div className="fixed inset-0 z-[1000]">
        {/* overlay */}
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

        {/* content */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <Dialog.Panel
              className={[
                'bg-white rounded shadow-2xl max-w-sm w-full p-6 border-l-4',
                colors.border, // border-*-*
              ].join(' ')}
            >
              <div className="flex items-center mb-3">
                {icon && <div className={['w-6 h-6 mr-2', colors.text].join(' ')}>{icon}</div>}
                <Dialog.Title className={['text-lg font-bold', colors.text].join(' ')}>
                  {title}
                </Dialog.Title>
              </div>

              <div className="text-sm text-gray-800">{message}</div>

              {reason && (
                <div
                  className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  <b>เหตุผลการปฏิเสธ:</b> {reason}
                </div>
              )}

              {seconds != null && seconds > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  ป๊อปอัพจะปิดอัตโนมัติใน {seconds} วินาที
                  <div className="mt-1 h-1 w-full bg-gray-200 rounded">
                    <div
                      className="h-1 bg-gray-500 rounded" 
                      style={{
                        width: `${100 - (remain! / (autoCloseMs as number)) * 100}%`,
                        transition: 'width 0.2s linear',
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={onClose}
                  className={[
                    'text-white px-4 py-1.5 rounded hover:bg-opacity-90',
                    colors.bg, // bg-*-*
                  ].join(' ')}
                >
                  {confirmText}
                </button>
              </div>
            </Dialog.Panel>
          </motion.div>
        </div>
      </div>
    </Dialog>
  )
}
