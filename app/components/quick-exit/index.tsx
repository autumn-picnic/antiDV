'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function quickEscape() {
  window.dispatchEvent(new Event('xiaoan:quick-exit'))
  // Hide sensitive content synchronously, then use the dedicated sign-out screen.
  document.documentElement.style.visibility = 'hidden'
  try { localStorage.clear(); sessionStorage.clear() } catch {}
  window.location.replace('/exit')
}

export default function QuickExit() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname === '/exit') { return }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.repeat) { return }
      // Native dialog cancellation and local menu handlers own this key first.
      if (document.querySelector('dialog[open], [data-escape-layer="true"]')) { return }
      const settings = document.querySelector<HTMLDetailsElement>('details.chat-account-menu[open], details.chat-settings[open], details.chat-toolbar[open], details.composer-details[open]')
      if (settings) {
        settings.open = false
        settings.querySelector('summary')?.focus()
        event.preventDefault()
        return
      }
      event.preventDefault()
      quickEscape()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pathname])
  if (pathname === '/exit') { return null }
  return <div className="quick-exit-slot">
    <button type="button" className="quick-exit-button" onClick={quickEscape}
      aria-label="快速离开此页面">快速离开</button>
  </div>
}
