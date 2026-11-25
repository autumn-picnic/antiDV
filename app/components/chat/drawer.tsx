'use client'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** Nonmodal drawer: the toolbar and the existing quick-exit stay operable. */
export default function ChatDrawer({ id, label, side, onClose, children }: {
  id: string
  label: string
  side: 'left' | 'right'
  onClose: () => void
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const dismiss = useRef(onClose)
  dismiss.current = onClose
  useEffect(() => {
    const opener = document.activeElement
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onOutside = (event: PointerEvent) => {
      const target = event.target as Element
      if (target.closest('.chat-drawer, .chat-toolbar, dialog, [aria-label="快速离开此页面"]')) { return }
      dismiss.current()
    }
    document.addEventListener('pointerdown', onOutside)
    return () => {
      document.removeEventListener('pointerdown', onOutside)
      if (opener instanceof HTMLElement && opener.isConnected) { opener.focus() }
    }
  }, [])
  return <div className="chat-drawer-layer">
    <div className="chat-drawer-backdrop" aria-hidden="true" onClick={onClose} />
    <div id={id} ref={panel} role="dialog" data-escape-layer="true" aria-label={label} onKeyDown={event => {
      if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); onClose() }
    }} className={`chat-drawer chat-drawer-${side}`}>
      <div className="chat-drawer-heading"><h2>{label}</h2><button type="button" aria-label={`关闭${label}`} onClick={onClose}>×</button></div>
      {children}
    </div>
  </div>
}
