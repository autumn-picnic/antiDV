import { createParser } from 'eventsource-parser'
import type { ChatDebug, CompletedResponse, ConversationSummary, ConversationView, GuardDiagnostic } from '../types/chatflow'

export class ChatApiError extends Error {
  constructor(public status: number, message: string, public responseId?: string, public guard?: GuardDiagnostic) {
    super(message)
  }
}

function httpMessage(status: number) {
  if (status === 202) { return '变更已提交，恢复保护记录仍在同步。请稍后刷新状态；目前尚未确认完成。' }
  if (status === 409) { return '设置已在其他请求中更新，请刷新状态后重新选择' }
  if (status === 404) { return '会话已过期或不可访问，请新建对话' }
  if (status === 403) { return '请求未获允许，请检查服务配置' }
  if (status === 422) { return '请输入 1–4000 字的消息' }
  if (status === 429) { return '请求过于频繁，请稍后重试' }
  return '小安暂时无法提供服务，请稍后重试'
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`/v1${path}`, { ...init, credentials: 'include', cache: 'no-store' })
  if (!response.ok || response.status === 202) {
    await response.body?.cancel()
    throw new ChatApiError(response.status, httpMessage(response.status))
  }
  return response
}

export async function createConversation(signal?: AbortSignal): Promise<{ conversation_id: string }> {
  const data = await (await request('/conversations', { method: 'POST', signal })).json()
  if (typeof data.conversation_id !== 'string' || !data.conversation_id) { throw new ChatApiError(502, '会话服务返回格式无效') }
  return data
}

export async function fetchConversations(signal?: AbortSignal): Promise<ConversationSummary[]> {
  const items: ConversationSummary[] = []
  let offset = 0
  while (true) {
    const page = await (await request(`/conversations?limit=100&offset=${offset}`, { signal })).json()
    if (!Array.isArray(page.items) || page.items.some((item: ConversationSummary) => typeof item.id !== 'string')) {
      throw new ChatApiError(502, '会话列表格式无效')
    }
    items.push(...page.items)
    if (page.next_offset == null) { return items }
    if (!Number.isInteger(page.next_offset) || page.next_offset <= offset) { throw new ChatApiError(502, '会话分页格式无效') }
    offset = page.next_offset
  }
}

export async function fetchConversation(id: string, signal?: AbortSignal): Promise<ConversationView> {
  const turns: ConversationView['turns'] = []
  let after = 0
  while (true) {
    const page: ConversationView = await (await request(`/conversations/${encodeURIComponent(id)}?limit=100&after=${after}`, { signal })).json()
    if (page.conversation_id !== id || !Array.isArray(page.turns)
      || page.turns.some(turn => typeof turn.user !== 'string' || typeof turn.assistant !== 'string')) {
      throw new ChatApiError(502, '会话记录格式无效')
    }
    turns.push(...page.turns)
    if (page.next_after == null) { return { conversation_id: id, turns } }
    if (!Number.isInteger(page.next_after) || page.next_after <= after) { throw new ChatApiError(502, '记录分页格式无效') }
    after = page.next_after
  }
}

export async function fetchCurrentConversation(signal?: AbortSignal): Promise<ConversationView | null> {
  let response: Response
  try { response = await request('/conversations/current', { signal }) }
  catch (error) {
    if (error instanceof ChatApiError && error.status === 404) { return null }
    throw error
  }
  const current = await response.json()
  if (typeof current.conversation_id !== 'string') { throw new ChatApiError(502, '当前会话格式无效') }
  // Account-mode /current contains at most 100 turns; use the paginated endpoint.
  return fetchConversation(current.conversation_id, signal)
}

export async function deleteConversation(id: string) {
  await request(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export interface StreamCallbacks {
  onStart?: (responseId: string) => void
  onDelta: (text: string) => void
}

function guardDiagnostic(value: unknown): GuardDiagnostic | undefined {
  const guard = (value as { debug?: { output_guard?: GuardDiagnostic } } | null)?.debug?.output_guard
  return guard && ['allow', 'block', 'inconclusive'].includes(guard.status) && typeof guard.regenerated === 'boolean'
    ? guard as GuardDiagnostic
    : undefined
}

/** Success means completed, never EOF. This function never retries generation. */
export async function readChatStream(
  response: Response,
  conversationId: string,
  callbacks: StreamCallbacks,
  idleTimeoutMs = 60000,
): Promise<CompletedResponse> {
  if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
    await response.body?.cancel()
    throw new ChatApiError(502, '服务未返回流式回复，请稍后重试')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let responseId: string | undefined
  let completed: CompletedResponse | undefined
  let sawDebug = false
  let debug: ChatDebug | undefined
  let lastWasCR = false
  const parser = createParser((event) => {
    if (event.type !== 'event' || completed) { return }
    const data = JSON.parse(event.data)
    if (!data || data.conversation_id !== conversationId || typeof data.response_id !== 'string' || !data.response_id) {
      throw new ChatApiError(502, '回复标识不一致', responseId)
    }
    if (!responseId) {
      if (event.event !== 'start') { throw new ChatApiError(502, '回复缺少开始事件') }
      responseId = data.response_id
      callbacks.onStart?.(data.response_id)
      return
    }
    if (data.response_id !== responseId) { throw new ChatApiError(502, '回复标识不一致', responseId) }
    switch (event.event) {
      case 'delta':
        if (sawDebug || typeof data.delta !== 'string') { throw new ChatApiError(502, '回复片段格式无效', responseId) }
        callbacks.onDelta(data.delta)
        break
      case 'debug':
        if (sawDebug) { throw new ChatApiError(502, '重复的调试事件', responseId) }
        sawDebug = true
        if (data.debug && typeof data.debug === 'object') { debug = data.debug }
        break // Diagnostics stay separate from visible and exported answer text.
      case 'completed':
        if (!['normal', 'unclear', 'immediate_danger', 'self_harm'].includes(data.safety_level)) {
          throw new ChatApiError(502, '安全状态格式无效', responseId)
        }
        completed = { ...data, debug }
        break
      case 'error':
        throw new ChatApiError(503, '本次回复未完成，请稍后手动重试', responseId, guardDiagnostic(data))
      default:
        throw new ChatApiError(502, '回复事件顺序无效', responseId)
    }
  })
  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new ChatApiError(0, '连接超时，请先检查会话记录', responseId)), idleTimeoutMs)
        }),
      ]).finally(() => clearTimeout(timer))
      if (chunk.done) { throw new ChatApiError(0, '连接中断，请先检查会话记录', responseId) }
      // v1 parser loses CRLF state when CR and LF arrive in separate chunks.
      // Normalize line endings while retaining that state across network reads.
      let normalized = ''
      for (const char of decoder.decode(chunk.value, { stream: true })) {
        if (char === '\n' && lastWasCR) { lastWasCR = false; continue }
        normalized += char === '\r' ? '\n' : char
        lastWasCR = char === '\r'
      }
      if (normalized) { parser.feed(normalized) }
      if (completed) { return completed }
    }
  }
  catch (error) {
    if (error instanceof ChatApiError) { throw error }
    throw new ChatApiError(0, '回复中断或格式无效，请先检查会话记录', responseId)
  }
  finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export async function sendChatMessage(id: string, message: string, callbacks: StreamCallbacks, signal: AbortSignal, debug = false) {
  if (!message.trim() || Array.from(message).length > 4000) { throw new ChatApiError(422, httpMessage(422)) }
  const response = await request(`/conversations/${encodeURIComponent(id)}/responses/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify({ message, debug }),
    signal,
  })
  return readChatStream(response, id, callbacks)
}

export async function fetchReviews(conversationId: string, signal?: AbortSignal): Promise<Record<string, { score: number, comment: string }>> {
  const response = await fetch(`/api/reviews?conversationId=${encodeURIComponent(conversationId)}`, { credentials: 'include', cache: 'no-store', signal })
  if (!response.ok) { throw new ChatApiError(response.status, '评价暂时无法读取') }
  const data = await response.json()
  return Object.fromEntries(data.items.map((item: { responseId: string, score: number, comment: string }) => [item.responseId, { score: item.score, comment: item.comment }]))
}

export async function saveReview(conversationId: string, responseId: string, review: { score: number, comment: string }) {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, responseId, ...review }),
  })
  if (!response.ok) { throw new ChatApiError(response.status, response.status === 401 ? '登录已失效，请重新登录' : '评价未保存，请重试') }
}
