export const GUEST_LOGIN_PROMPT_TURNS = 5
export const GUEST_LOGIN_PROMPT_KEY = 'xiaoan_guest_login_prompt'
export interface GuestPromptState { completedTurns: number, dismissed: boolean }

export function readGuestPrompt(value: string | null): GuestPromptState {
  try {
    const parsed = JSON.parse(value || 'null')
    if (Number.isSafeInteger(parsed?.completedTurns) && parsed.completedTurns >= 0 && typeof parsed.dismissed === 'boolean') {
      return { completedTurns: parsed.completedTurns, dismissed: parsed.dismissed }
    }
  }
  catch { /* Storage may be unavailable or contain an old value. */ }
  return { completedTurns: 0, dismissed: false }
}

export function shouldPromptGuest(state: GuestPromptState, signedIn: boolean) {
  return !signedIn && !state.dismissed && state.completedTurns >= GUEST_LOGIN_PROMPT_TURNS
}
