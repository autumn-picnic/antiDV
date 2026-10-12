'use client'
import { useEffect, useRef, useState } from 'react'
import { GUEST_LOGIN_PROMPT_KEY, readGuestPrompt, shouldPromptGuest } from '@/lib/auth/guest-prompt'
import type { GuestPromptState } from '@/lib/auth/guest-prompt'

export default function useGuestLoginPrompt(signedIn: boolean) {
  const current = useRef<GuestPromptState>({ completedTurns: 0, dismissed: false })
  const [state, setState] = useState(current.current)
  useEffect(() => {
    try { current.current = readGuestPrompt(sessionStorage.getItem(GUEST_LOGIN_PROMPT_KEY)) }
    catch { /* Keep the in-memory count if storage is blocked. */ }
    setState(current.current)
  }, [])

  function update(next: GuestPromptState) {
    current.current = next
    setState(next)
    try { sessionStorage.setItem(GUEST_LOGIN_PROMPT_KEY, JSON.stringify(next)) }
    catch { /* The prompt still works for this mounted chat. */ }
  }
  return {
    visible: shouldPromptGuest(state, signedIn),
    completed: () => {
      if (!signedIn) { update({ ...current.current, completedTurns: current.current.completedTurns + 1 }) }
    },
    dismiss: () => update({ ...current.current, dismissed: true }),
  }
}
