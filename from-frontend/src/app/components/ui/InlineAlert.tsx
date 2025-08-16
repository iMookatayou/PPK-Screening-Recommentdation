'use client'
import { type ComponentType } from 'react'
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

type Variant = 'danger' | 'warning' | 'info' | 'success'

const variantClass: Record<Variant, string> = {
  danger:  'text-red-600',
  warning: 'text-amber-600',
  info:    'text-blue-600',
  success: 'text-emerald-600',
}

const defaultIcon: Record<Variant, ComponentType<{ className?: string }>> = {
  danger:  AlertTriangle,
  warning: AlertCircle,
  info:    Info,
  success: CheckCircle2,
}

export default function InlineAlert({
  children,
  variant = 'danger',
  icon: Icon,
  className = '',
  iconClassName = 'w-5 h-5',
}: {
  children: React.ReactNode
  variant?: Variant
  icon?: ComponentType<{ className?: string }>
  className?: string
  iconClassName?: string
}) {
  const IconToUse = Icon ?? defaultIcon[variant]
  const color = variantClass[variant]

  return (
    <div className={`flex items-center gap-2 ${color} ${className}`}>
      <IconToUse className={iconClassName} aria-hidden />
      <span className="leading-snug">{children}</span>
    </div>
  )
}
