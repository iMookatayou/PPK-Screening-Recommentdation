'use client'

import { useEffect, useState } from 'react'

export default function LoadingDots() {
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        fontSize: '2rem',
        marginTop: '1.5rem',
        color: '#3b82f6',
        letterSpacing: '0.3rem',
        fontWeight: 'bold',
        minHeight: '2.5rem',
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      {'.'.repeat(dots)}
    </div>
  )
}
