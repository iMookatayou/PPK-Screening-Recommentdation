'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

type ToastType = 'success' | 'error' | 'warning' | 'info'
type ToastPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center'

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
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)

  // ✅ สำคัญ! เพื่อให้ ReactDOM.createPortal ไม่รันบน SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = uuidv4()
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, toast.duration || 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {mounted && typeof window !== 'undefined' && (
        <div id="__toast-root__">
          <ToastContainer toasts={toasts} />
        </div>
      )}
    </ToastContext.Provider>
  )
}

const ToastContainer: React.FC<{ toasts: ToastItem[] }> = ({ toasts }) => {
  const positions: ToastPosition[] = [
    'top-left', 'top-right', 'top-center',
    'bottom-left', 'bottom-right', 'bottom-center'
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
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.3 }}
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
                    pointerEvents: 'auto'
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
    case 'error': return <XCircle size={size} />
    case 'warning': return <AlertTriangle size={size} />
    case 'info': return <Info size={size} />
  }
}

const getColor = (type: ToastType) => {
  switch (type) {
    case 'success': return '#16a34a'
    case 'error': return '#dc2626'
    case 'warning': return '#f59e0b'
    case 'info': return '#2563eb'
  }
}

const getPositionStyle = (pos: ToastPosition): React.CSSProperties => {
  const base = {
    position: 'fixed' as const,
    zIndex: 9999,
    padding: '0.5rem',
    pointerEvents: 'none' as React.CSSProperties['pointerEvents']
  }
  switch (pos) {
    case 'top-left': return { ...base, top: 20, left: 20 }
    case 'top-right': return { ...base, top: 20, right: 20 }
    case 'top-center': return { ...base, top: 20, left: '50%', transform: 'translateX(-50%)' }
    case 'bottom-left': return { ...base, bottom: 20, left: 20 }
    case 'bottom-right': return { ...base, bottom: 20, right: 20 }
    case 'bottom-center': return { ...base, bottom: 20, left: '50%', transform: 'translateX(-50%)' }
  }
}
