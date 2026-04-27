'use client'

import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative w-full ${maxWidth} bg-[#141720] border border-[#2A2F42] rounded-2xl shadow-2xl animate-slideIn`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2F42]">
          <h2 className="text-base font-semibold text-[#E8EAF0]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger = false }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="text-sm text-[#6B7280] mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors cursor-pointer ${
            danger
              ? 'bg-[#FF4D6A]/15 text-[#FF4D6A] border border-[#FF4D6A]/30 hover:bg-[#FF4D6A]/25'
              : 'bg-[#7B61FF] text-white hover:bg-[#5B41DF]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
