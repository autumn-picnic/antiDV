'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function quickEscape() {
  // Hide sensitive content synchronously, then use the dedicated sign-out screen.
  document.documentElement.style.visibility = 'hidden'
  try { localStorage.clear(); sessionStorage.clear() } catch {}
  window.location.replace('/exit')
}

export default function QuickExit() {
  const pathname = usePathname()
  // null = use default CSS position (top-right); once dragged, track in px
  const [pos, setPos] = useState<{ x: number, y: number } | null>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    btnX: number
    btnY: number
    moved: boolean
  } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (pathname === '/exit') { return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { quickEscape() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pathname])

  const startDrag = (clientX: number, clientY: number) => {
    const btn = btnRef.current
    if (!btn) { return }
    const rect = btn.getBoundingClientRect()
    dragRef.current = { startX: clientX, startY: clientY, btnX: rect.left, btnY: rect.top, moved: false }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) { return }
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) { dragRef.current.moved = true }
      if (dragRef.current.moved) {
        const x = Math.max(0, Math.min(window.innerWidth - 120, dragRef.current.btnX + dx))
        const y = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.btnY + dy))
        setPos({ x, y })
      }
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    startDrag(t.clientX, t.clientY)
    const onMove = (ev: TouchEvent) => {
      if (!dragRef.current) { return }
      const touch = ev.touches[0]
      const dx = touch.clientX - dragRef.current.startX
      const dy = touch.clientY - dragRef.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) { dragRef.current.moved = true }
      if (dragRef.current.moved) {
        ev.preventDefault()
        const x = Math.max(0, Math.min(window.innerWidth - 120, dragRef.current.btnX + dx))
        const y = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.btnY + dy))
        setPos({ x, y })
      }
    }
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }

  const handleClick = () => {
    if (dragRef.current?.moved) { return }
    quickEscape()
  }

  const posStyle = pos
    ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const }
    : { top: 14, right: 20 }

  if (pathname === '/exit') { return null }

  return (
    <button
      ref={btnRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      aria-label="快速离开此页面"
      title="快速离开（可拖动，或按 ESC）"
      style={{
        position: 'fixed',
        zIndex: 9999,
        cursor: 'grab',
        backgroundColor: pathname === '/' ? '#ffebcf' : '#d9b18d',
        color: pathname === '/' ? '#c45c21' : '#fff',
        border: pathname === '/' ? '1px solid #d97639' : '1px solid transparent',
        borderRadius: 999,
        padding: '6px 14px',
        minHeight: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 400,
        boxShadow: 'none',
        fontFamily: 'inherit',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        ...posStyle,
      }}
    >
      快速离开 <span aria-hidden="true" style={{ marginLeft: 4 }}>×</span>
    </button>
  )
}
