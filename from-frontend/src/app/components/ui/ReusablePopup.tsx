'use client'

import { Dialog } from '@headlessui/react'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ReusablePopupProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  icon?: ReactNode
  color?: 'red' | 'yellow' | 'blue' | 'green'
  confirmText?: string
}

const colorMap = {
  red: 'red-600',
  yellow: 'yellow-500',
  blue: 'blue-500',
  green: 'green-600',
}

export default function ReusablePopup({
  isOpen,
  onClose,
  title,
  message,
  icon,
  color = 'blue',
  confirmText = 'ปิด',
}: ReusablePopupProps) {
  const borderColor = colorMap[color] || 'blue-500'

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <Dialog.Panel className={`bg-white rounded shadow-2xl max-w-sm w-full p-6 border-l-4 border-${borderColor}`}>
            <div className="flex items-center mb-3">
              {icon && <div className={`text-${borderColor} w-6 h-6 mr-2`}>{icon}</div>}
              <Dialog.Title className={`text-lg font-bold text-${borderColor}`}>
                {title}
              </Dialog.Title>
            </div>
            <p className="text-sm text-gray-800">{message}</p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className={`bg-${borderColor} text-white px-4 py-1.5 rounded hover:bg-opacity-80`}
              >
                {confirmText}
              </button>
            </div>
          </Dialog.Panel>
        </motion.div>
      </div>
    </Dialog>
  )
}
