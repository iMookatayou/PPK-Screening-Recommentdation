'use client'

import ModalPortal from '@/app/components/internal/ModalPortal'

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose?: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <ModalPortal>
      {/* overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[1000]"
        onClick={onClose}
      />
      {/* content */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[min(92vw,680px)] rounded-xl bg-white shadow-xl z-[1001] p-6"
      >
        {children}
      </div>
    </ModalPortal>
  )
}
