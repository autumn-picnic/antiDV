import type { ChatOperation } from '../hooks/use-chatflow'

/** Tab-local prompt policy; dismissal never changes the backend safety verdict. */
export class CrisisPromptPolicy {
  private episodes = new Set<string>()
  private seen = new Set<string>()
  private conversation = ''
  pending: string | null = null

  update(conversation: string, operation: ChatOperation | null) {
    if (this.conversation !== conversation) {
      this.pending = null
      this.conversation = conversation
    }
    if (!operation || operation.conversationId !== conversation) { this.pending = null; return }
    if (operation.kind !== 'completed') { this.pending = null; return }
    if (!operation.responseId) { return }
    const key = `${conversation}:${operation.responseId}`
    if (this.seen.has(key)) { return }
    this.seen.add(key)
    this.pending = null
    if (operation.safetyLevel === 'normal') { this.episodes.delete(conversation) }
    if (['immediate_danger', 'self_harm'].includes(operation.safetyLevel || '') && !this.episodes.has(conversation)) {
      this.pending = key
    }
  }

  show() {
    if (!this.pending) { return false }
    this.episodes.add(this.conversation)
    this.pending = null
    return true
  }
}
