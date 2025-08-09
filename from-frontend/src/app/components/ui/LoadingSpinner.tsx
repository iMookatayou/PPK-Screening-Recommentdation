'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  message?: string
  size?: number
  color?: string
}

export default function LoadingSpinner({
  message = 'กำลังโหลดข้อมูล...',
  size = 40,
  color = '#3b82f6', // tailwind blue-500
}: LoadingSpinnerProps) {
  const borderSize = Math.max(size * 0.12, 4)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '2rem',
        marginBottom: '2rem',
        color: '#1e293b', // slate-800
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        style={{
          width: size,
          height: size,
          border: `${borderSize}px solid #e5e7eb`, // neutral border
          borderTop: `${borderSize}px solid ${color}`,
          borderRadius: '50%',
          marginBottom: '1rem',
        }}
      />

      <motion.span
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: '1rem',
          fontWeight: 500,
        }}
      >
        {message}
      </motion.span>
    </div>
  )
}
