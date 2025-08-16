'use client'

import React, {
  createContext, useContext, useState, useCallback, useEffect, useRef
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'warning' | 'info'
type ToastPosition =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'

interface ToastItem {
  id: string
  type: ToastType
  message: React.ReactNode
  icon?: React.ReactNode
  duration?: number
  position?: ToastPosition
}

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)
  const timeoutsRef = useRef<Record<string, number>>({})

  useEffect(() => setMounted(true), [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const tid = timeoutsRef.current[id]
    if (tid) {
      clearTimeout(tid)
      delete timeoutsRef.current[id]
    }
  }, [])

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = uuidv4()
    const item: ToastItem = { id, position: 'top-right', duration: 3000, ...toast }
    setToasts(prev => [...prev, item])

    // auto dismiss + เก็บกวาด
    const tid = window.setTimeout(() => removeToast(id), item.duration!)
    timeoutsRef.current[id] = tid
  }, [removeToast])

  // เคลียร์ทุก timeout ตอน unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout)
      timeoutsRef.current = {}
    }
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {mounted && typeof window !== 'undefined' &&
        createPortal(<ToastContainer toasts={toasts} onClose={removeToast} />, document.body)}
    </ToastContext.Provider>
  )
}

const ToastContainer: React.FC<{ toasts: ToastItem[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
  const positions: ToastPosition[] = [
    'top-left','top-right','top-center','bottom-left','bottom-right','bottom-center'
  ]
  return (
    <>
      {positions.map(position => (
        <div key={position} style={getPositionStyle(position)}>
          <AnimatePresence>
            {toasts
              .filter(t => (t.position || 'top-right') === position)
              .map(t => (
                <motion.div
                  key={t.id}
                  initial={getInitial(position)}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={getExit(position)}
                  transition={{ duration: 0.25 }}
                  onClick={() => onClose(t.id)}
                  style={{
                    background: getColor(t.type),
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: 10,
                    minWidth: 250,
                    pointerEvents: 'auto',
                    cursor: 'pointer'
                  }}
                >
                  {t.icon ?? getDefaultIcon(t.type)}
                  <span>{t.message}</span>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      ))}
    </>
  )
}

const getDefaultIcon = (type: ToastType) => {
  const size = 20
  switch (type) {
    case 'success': return <CheckCircle size={size} />
    case 'error':   return <XCircle size={size} />
    case 'warning': return <AlertTriangle size={size} />
    case 'info':    return <Info size={size} />
  }
}

const getColor = (type: ToastType) => {
  switch (type) {
    case 'success': return '#16a34a'
    case 'error':   return '#dc2626'
    case 'warning': return '#f59e0b'
    case 'info':    return '#2563eb'
  }
}

const getPositionStyle = (pos: ToastPosition): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10010,          // สูงกว่า modal/toolbar ชัวร์
    padding: '0.5rem',
    pointerEvents: 'none',  // container โปร่ง
  }
  switch (pos) {
    case 'top-left':     return { ...base, top: 20, left: 20 }
    case 'top-right':    return { ...base, top: 20, right: 20 }
    case 'top-center':   return { ...base, top: 20, left: '50%', transform: 'translateX(-50%)' }
    case 'bottom-left':  return { ...base, bottom: 20, left: 20 }
    case 'bottom-right': return { ...base, bottom: 20, right: 20 }
    case 'bottom-center':return { ...base, bottom: 20, left: '50%', transform: 'translateX(-50%)' }
  }
}

const getInitial = (pos: ToastPosition) => {
  if (pos.includes('left'))  return { opacity: 0, x: -50, y: 0 }
  if (pos.includes('right')) return { opacity: 0, x: 50,  y: 0 }
  // centers
  return pos.startsWith('top')
    ? { opacity: 0, x: 0, y: -30 }
    : { opacity: 0, x: 0, y: 30 }
}

const getExit = (pos: ToastPosition) => {
  if (pos.includes('left'))  return { opacity: 0, x: -50, y: 0 }
  if (pos.includes('right')) return { opacity: 0, x: 50,  y: 0 }
  return pos.startsWith('top')
    ? { opacity: 0, x: 0, y: -30 }
    : { opacity: 0, x: 0, y: 30 }
}
