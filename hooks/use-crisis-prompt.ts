'use client'
import { useEffect, useRef, useState } from 'react'
import type { ChatOperation } from './use-chatflow'
import { CrisisPromptPolicy } from '../utils/crisis-prompt'

export default function useCrisisPrompt(conversationId: string, operation: ChatOperation | null) {
  const policy = useRef(new CrisisPromptPolicy())
  const [visibleFor, setVisibleFor] = useState<string | null>(null)
  const exiting = useRef(false)
  useEffect(() => {
    policy.current.update(conversationId, operation)
    setVisibleFor(null)
    let frame = 0
    const check = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (exiting.current || document.querySelector('dialog[open], [role="dialog"], [data-escape-layer="true"], details.chat-settings[open]')) { return }
        if (policy.current.show()) { setVisibleFor(conversationId) }
      })
    }
    const observer = new MutationObserver(check)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'data-escape-layer', 'role'] })
    const exit = () => { exiting.current = true; policy.current.pending = null; setVisibleFor(null) }
    window.addEventListener('xiaoan:quick-exit', exit)
    check()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('xiaoan:quick-exit', exit)
    }
  }, [conversationId, operation])
  return { visible: visibleFor === conversationId, dismiss: () => setVisibleFor(null) }
}
