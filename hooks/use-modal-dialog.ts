'use client'
import { useEffect } from 'react'
import type { RefObject } from 'react'

/** Native top-layer modality, Escape isolation and predictable focus restoration. */
export default function useModalDialog(ref: RefObject<HTMLDialogElement | null>, open = true) {
  useEffect(() => {
    const element = ref.current
    if (!element || !open) { return }
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const isolateEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation() }
    }
    element.addEventListener('keydown', isolateEscape)
    element.showModal()
    element.querySelector<HTMLElement>('[data-modal-autofocus]')?.focus()
    return () => {
      element.removeEventListener('keydown', isolateEscape)
      element.close()
      if (trigger?.isConnected) { trigger.focus({ preventScroll: true }) }
    }
  }, [ref, open])
}
