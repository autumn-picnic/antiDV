'use client'
import { useRef } from 'react'
import type { ReactNode } from 'react'
import useModalDialog from '@/hooks/use-modal-dialog'
import { quickEscape } from '@/app/components/quick-exit'

export default function Modal({ title, onClose, children, className = '' }: {
  title: string, onClose: () => void, children: ReactNode, className?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useModalDialog(dialog)
  return <dialog ref={dialog} aria-label={title} className={`accessible-modal ${className}`}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="modal-actions">
      <button type="button" onClick={onClose} autoFocus>关闭{title}</button>
      <button type="button" onClick={quickEscape}>快速离开</button>
    </div>
    {children}
  </dialog>
}
