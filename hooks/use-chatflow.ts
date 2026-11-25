'use client'
import { useEffect, useRef, useState } from 'react'
import { summarizeConversationTitle } from '../utils/conversation-title'
import { createStreamRenderer } from '../utils/stream-renderer'
import { ChatApiError, fetchModelConversationTitle, fetchConversationFirstMessage, createConversation, deleteConversation, fetchConversation, fetchConversations, fetchCurrentConversation, sendChatMessage, fetchReviews, saveReview, saveChatFailure } from '../service'
import type { ConversationItem } from '../types/app'
import type { ConversationView, DebugChatItem, GuardDiagnostic, ChatDebug } from '../types/chatflow'

function suggestedQuestions(value: unknown): string[] | undefined {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim()))] : undefined
}

function chatItems(view: ConversationView): DebugChatItem[] {
  return view.turns.flatMap((turn, index) => {
    const id = turn.response_id || `${view.conversation_id}-${turn.number ?? index}`
    return [
      { id: `question-${id}`, content: turn.user, isAnswer: false },
      { id, content: turn.assistant, isAnswer: true, safetyLevel: turn.safety_level || undefined, suggestedQuestions: suggestedQuestions(turn.suggested_questions), debug: turn.debug, reasoning: turn.reasoning, fallback: turn.status === 'failed' ? turn.fallback : undefined },
    ]
  })
}

function errorMessage(error: unknown) {
  return error instanceof ChatApiError ? error.message : '暂时无法连接小安，请稍后重试'
}

export interface ChatOperation { id: string, conversationId: string, kind: 'sending' | 'completed' | 'stopped' | 'failed', content?: string, responseId?: string, safetyLevel?: import('../types/chatflow').SafetyLevel }

interface Failure { message: string, query?: string, conversationId?: string, responseId?: string, needsRecovery?: boolean, debug?: ChatDebug, guard?: GuardDiagnostic, attemptId?: string, fallback?: ChatApiError['fallback'] }

export default function useChatflow({ authReady, signedIn, debug = false, onCompleted, historyOpen = false, authKey }: { authReady: boolean, signedIn: boolean, debug?: boolean, onCompleted: () => void, historyOpen?: boolean, authKey?: string }) {
  const [conversationList, setConversationList] = useState<ConversationItem[]>([])
  const [conversationId, setConversationId] = useState('-1')
  const [chatList, setChatList] = useState<DebugChatItem[]>([])
  const [busy, setBusy] = useState(true)
  const [isResponding, setResponding] = useState(false)
  const debugEnabled = debug
  const [reviewError, setReviewError] = useState('')
  const [operation, setOperation] = useState<ChatOperation | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const lock = useRef(true)
  const controller = useRef<AbortController | null>(null)
  const renderer = useRef<ReturnType<typeof createStreamRenderer> | null>(null)
  const cancelSend = useRef<(() => void) | null>(null)
  const mounted = useRef(true)

  const titles = useRef(new Map<string, string>())
  const generatedTitles = useRef(new Set<string>())
  const titleRequests = useRef(new Map<string, AbortController>())
  function applyModelTitle(id: string, title: string) {
    generatedTitles.current.add(id)
    titles.current.set(id, title)
    setConversationList(list => list.map(item => item.id === id ? { ...item, name: title } : item))
  }
  async function updateModelTitle(id: string, generate: boolean) {
    if (titleRequests.current.has(id)) {
      if (!generate) { return }
      titleRequests.current.get(id)?.abort()
    }
    const abort = new AbortController()
    titleRequests.current.set(id, abort)
    try {
      const title = await fetchModelConversationTitle(id, generate, abort.signal)
      if (!abort.signal.aborted && mounted.current && title) { applyModelTitle(id, title) }
    }
    catch { /* Keep the extractive title; title errors never interrupt the chat. */ }
    finally { if (titleRequests.current.get(id) === abort) { titleRequests.current.delete(id) } }
  }
  function rememberTitle(id: string, message: string) {
    if (generatedTitles.current.has(id)) { return }
    const title = summarizeConversationTitle(message)
    titles.current.set(id, title)
    setConversationList(list => list.map(item => item.id === id ? { ...item, name: title } : item))
  }

  async function refreshList(signal?: AbortSignal) {
    const rows = await fetchConversations(signal)
    if (mounted.current && !signal?.aborted) {
      setConversationList(rows.map(row => ({
        id: row.id,
        name: titles.current.get(row.id) || '未命名对话',
        inputs: null,
        introduction: '',
      })))
    }
    return rows
  }

  useEffect(() => {
    if (!authReady) { return }
    mounted.current = true
    lock.current = true
    setBusy(true)
    setResponding(false)
    titles.current.clear()
    generatedTitles.current.clear()
    setConversationList([])
    setConversationId('-1')
    setChatList([])
    setOperation(null)
    setFailure(null)
    const abort = new AbortController()
    controller.current = abort
    let active = true
    const requests = titleRequests.current
    async function init() {
      try {
        // Keep the new-chat state on page load; history opens only when selected.
        await refreshList(abort.signal)
      }
      catch (error) {
        if (active) { setFailure({ message: errorMessage(error) }) }
      }
      finally {
        if (active) { lock.current = false; setBusy(false) }
      }
    }
    void init()
    return () => {
      active = false; mounted.current = false; controller.current?.abort(); renderer.current?.cancel()
      requests.forEach(request => request.abort()); requests.clear()
    }
  }, [authReady, signedIn, authKey])

  const conversationIds = conversationList.map(item => item.id).join(',')
  useEffect(() => {
    if (!historyOpen || !authReady) { return }
    const abort = new AbortController()
    const queue = conversationIds.split(',').filter(Boolean)
    // Bound concurrent reads and cancel on close, identity change, or deletion.
    async function worker() {
      while (queue.length && !abort.signal.aborted) {
        const id = queue.shift()!
        try {
          const message = await fetchConversationFirstMessage(id, abort.signal)
          if (abort.signal.aborted) { return }
          rememberTitle(id, message)
          const previousModelTitle = generatedTitles.current.has(id) ? titles.current.get(id) : undefined
          const title = await fetchModelConversationTitle(id, false, abort.signal)
          if (!abort.signal.aborted) {
            if (title) { applyModelTitle(id, title) }
            else if (!titleRequests.current.has(id) && titles.current.get(id) === previousModelTitle) { generatedTitles.current.delete(id); rememberTitle(id, message) }
          }
        }
        catch { /* Keep the generic title; selecting a conversation still retries its read. */ }
      }
    }
    void Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker))
    return () => abort.abort()
  }, [historyOpen, conversationIds, authReady, signedIn, authKey])

  useEffect(() => {
    if (!authReady || conversationId === '-1' || isResponding) { return }
    const abort = new AbortController()
    setReviewError('')
    fetchReviews(conversationId, abort.signal).then((reviews) => {
      if (!abort.signal.aborted) { setChatList(list => list.map(item => ({ ...item, userReview: reviews[item.id] }))) }
    }).catch(() => { if (!abort.signal.aborted) { setReviewError('历史评价暂时无法读取；已保存的评价不会因此删除。') } })
    return () => abort.abort()
  }, [conversationId, isResponding, busy, signedIn, authReady])

  async function review(responseId: string, value: { score: number, comment: string }) {
    if (lock.current || !chatList.some(item => item.isAnswer && !item.fallback && item.id === responseId)) { throw new Error('请等待回答完成后再评价') }
    const id = conversationId
    await saveReview(id, responseId, value)
    if (mounted.current) { setChatList(list => list.map(item => item.id === responseId ? { ...item, userReview: value } : item)) }
  }

  function start() {
    if (lock.current) { return false }
    lock.current = true
    setBusy(true)
    setFailure(null)
    controller.current = new AbortController()
    return true
  }
  function finish() {
    lock.current = false
    if (mounted.current) { setBusy(false); setResponding(false) }
  }

  async function selectConversation(id: string) {
    if (!start()) { return false }
    setOperation(null)
    try {
      if (id === '-1') { setConversationId('-1'); setChatList([]); return true }
      const view = await fetchConversation(id, controller.current!.signal)
      if (mounted.current) { setConversationId(id); setChatList(chatItems(view)); rememberTitle(id, view.turns[0]?.user || ''); void updateModelTitle(id, false) }
      return true
    }
    catch (error) {
      if (mounted.current) {
        if (error instanceof ChatApiError && error.status === 404) {
          setConversationId('-1'); setChatList([])
          setConversationList(list => list.filter(item => item.id !== id))
        }
        setFailure({ message: errorMessage(error) })
      }
      return false
    }
    finally { finish() }
  }

  async function prepareConversation() {
    if (conversationId !== '-1') { return conversationId }
    if (!start()) { return null }
    try {
      const created = await createConversation(controller.current!.signal)
      if (!mounted.current) { return null }
      setConversationId(created.conversation_id)
      setConversationList(list => [{ id: created.conversation_id, name: '新对话', inputs: null, introduction: '' }, ...list])
      return created.conversation_id
    }
    catch (error) {
      if (mounted.current) { setFailure({ message: errorMessage(error) }) }
      return null
    }
    finally { finish() }
  }

  async function send(message: string) {
    if (!message.trim() || Array.from(message).length > 4000) {
      setFailure({ message: '请输入 1–4000 字的消息', query: message })
      return
    }
    if (!start()) { return }
    setResponding(true)
    const abort = controller.current!
    const isActive = () => mounted.current && controller.current === abort && !abort.signal.aborted
    let streamRenderer: ReturnType<typeof createStreamRenderer> | null = null
    const committed = chatList
    const attemptId = crypto.randomUUID()
    let text = ''
    setOperation({ id: attemptId, conversationId, kind: 'sending' })
    cancelSend.current = () => {
      abort.abort()
      streamRenderer?.cancel()
      controller.current = null
      renderer.current = null
      cancelSend.current = null
      setChatList(committed)
      setOperation({ id: attemptId, conversationId, kind: 'stopped', content: text })
      setFailure(null)
      finish()
    }
    let id = conversationId
    let responseId: string | undefined
    let startedGeneration = false
    let reasoning = ''
    const pendingId = `pending-${Date.now()}`
    try {
      if (id === '-1') {
        const created = await createConversation(abort.signal)
        id = created.conversation_id
        if (!isActive()) { return }
        setConversationId(id)
        setConversationList(list => [{ id, name: '新对话', inputs: null, introduction: '' }, ...list])
      }
      const question: DebugChatItem = { id: `question-${pendingId}`, content: message, isAnswer: false }
      setChatList([...committed, question, { id: pendingId, content: '', isAnswer: true }])
      streamRenderer = createStreamRenderer((delta) => {
        text += delta
        if (isActive()) { setChatList([...committed, question, { id: pendingId, content: text, reasoning, isAnswer: true }]) }
      })
      renderer.current = streamRenderer
      startedGeneration = true
      const completed = await sendChatMessage(id, message, {
        onStart: (value) => { if (isActive()) { responseId = value } },
        onReasoningDelta: (delta) => {
          if (!isActive()) { return }
          reasoning += delta
          setChatList([...committed, question, { id: pendingId, content: text, reasoning, isAnswer: true }])
        },
        onDelta: (delta) => {
          if (isActive()) { streamRenderer?.push(delta) }
        },
      }, abort.signal, debugEnabled)
      if (!isActive()) { return }
      await streamRenderer.finish()
      if (!isActive()) { return }
      setChatList([...committed, { ...question, id: `question-${completed.response_id}` }, {
        id: completed.response_id,
        content: text,
        reasoning,
        isAnswer: true,
        safetyLevel: completed.safety_level,
        suggestedQuestions: suggestedQuestions(completed.suggested_questions),
        debug: completed.debug,
      }])
      setOperation({ id: attemptId, conversationId: id, kind: 'completed', content: text, responseId: completed.response_id, safetyLevel: completed.safety_level })
      if (!committed.some(item => !item.isAnswer && !item.isOpeningStatement)) { rememberTitle(id, message); void updateModelTitle(id, true) }
      onCompleted()
    }
    catch (error) {
      if (!isActive()) { return }
      streamRenderer?.cancel()
      const expired = error instanceof ChatApiError && error.status === 404
      const fixedFallback = error instanceof ChatApiError ? error.fallback : undefined
      const failedId = responseId || (error instanceof ChatApiError ? error.responseId : undefined) || attemptId
      const failedItems: DebugChatItem[] = startedGeneration && !expired
        ? [...committed, { id: `question-${failedId}`, content: message, isAnswer: false },
          ...(fixedFallback ? [{ id: failedId, content: fixedFallback.details || fixedFallback.message,
            isAnswer: true, fallback: fixedFallback, feedbackDisabled: true,
            debug: error instanceof ChatApiError ? error.debug : undefined }] : [])]
        : committed
      setChatList(failedItems)
      setOperation({ id: attemptId, conversationId: id, kind: 'failed', content: text })
      if (expired) {
        setConversationId('-1'); setChatList([])
        setConversationList(list => list.filter(item => item.id !== id))
      }
      setFailure({
        attemptId,
        message: errorMessage(error),
        query: message,
        conversationId: expired ? undefined : id,
        responseId: responseId || (error instanceof ChatApiError ? error.responseId : undefined),
        needsRecovery: startedGeneration && !expired && !(error instanceof ChatApiError
          && error.status === 503 && error.fallback?.can_continue === true),
        guard: error instanceof ChatApiError ? error.guard : undefined,
        debug: error instanceof ChatApiError ? error.debug : undefined,
        fallback: error instanceof ChatApiError ? error.fallback : undefined,
      })
      if (!abort.signal.aborted) {
        const status = error instanceof ChatApiError ? error.status : 0
        const code = error instanceof ChatApiError ? error.code : undefined
        const guard = error instanceof ChatApiError ? error.guard?.status : undefined
        void saveChatFailure({
          id: attemptId, conversationId: id === '-1' ? null : id,
          responseId: responseId || (error instanceof ChatApiError ? error.responseId : undefined) || null,
          question: message, stage: startedGeneration ? 'generate_response' : 'create_conversation',
          status, code: code || null,
          reason: [errorMessage(error), status ? `错误状态 ${status}` : '连接中断或网络不可用', code, guard ? `输出检查：${guard}` : null].filter(Boolean).join('；'),
        }).catch(() => {
          if (mounted.current) {
            setFailure(current => current?.attemptId === attemptId ? { ...current, message: `${current.message}（失败记录暂未保存）` } : current)
          }
        })
      }
    }
    finally {
      // A stopped request may settle after a new send has already started.
      if (controller.current === abort) {
        controller.current = null
        renderer.current = null
        cancelSend.current = null
        finish()
      }
    }
  }

  async function recover() {
    const failed = failure
    if (!failed || !start()) { return }
    try {
      await refreshList(controller.current!.signal)
      const current = await fetchCurrentConversation(controller.current!.signal)
      const view = failed.conversationId && failed.conversationId !== current?.conversation_id
        ? await fetchConversation(failed.conversationId, controller.current!.signal)
        : current
      if (!mounted.current) { return }
      setConversationId(view?.conversation_id || '-1')
      setChatList(view ? chatItems(view) : [])
      if (view) {
        rememberTitle(view.conversation_id, view.turns[0]?.user || '')
        void updateModelTitle(view.conversation_id, view.turns.length === 1 && Boolean(failed.responseId) && view.turns[0].response_id === failed.responseId && view.turns[0].status !== 'failed')
      }
      const committed = failed.responseId && view?.turns.some(turn => turn.response_id === failed.responseId)
      if (failed.query && !committed) {
        setFailure({ ...failed, message: failed.fallback?.message || '已刷新记录。请核对是否已有回复，再决定是否重试。', needsRecovery: false })
      }
    }
    catch (error) {
      if (mounted.current) {
        if (error instanceof ChatApiError && error.status === 404) {
          setConversationId('-1'); setChatList([])
          setFailure({ message: error.message, query: failed.query, needsRecovery: false })
        }
        else { setFailure({ ...failed, message: errorMessage(error), needsRecovery: true }) }
      }
    }
    finally { finish() }
  }

  async function remove(ids: string[]) {
    if (!start()) { return }
    const removed = new Set<string>()
    try {
      for (const id of ids) {
        try { await deleteConversation(id) }
        catch (error) {
          if (!(error instanceof ChatApiError && error.status === 404)) { throw error }
        }
        removed.add(id)
        titles.current.delete(id); generatedTitles.current.delete(id)
        titleRequests.current.get(id)?.abort(); titleRequests.current.delete(id)
      }
    }
    catch (error) {
      if (mounted.current) { setFailure({ message: `部分删除未完成：${errorMessage(error)}` }) }
    }
    finally {
      if (mounted.current) {
        setConversationList(list => list.filter(item => !removed.has(item.id)))
        if (removed.has(conversationId)) { setConversationId('-1'); setChatList([]); setOperation(null) }
      }
      finish()
    }
  }

  return {
    operation,
    prepareConversation,
    debugEnabled,
    review,
    reviewError,
    conversationList,
    conversationId,
    chatList,
    busy,
    isResponding,
    failure,
    send,
    selectConversation,
    recover,
    retry: () => { if (failure?.query && !failure.needsRecovery) { void send(failure.query) } },
    stop: () => cancelSend.current?.(),
    remove: (id: string) => remove([id]),
    clearAll: () => remove(conversationList.map(item => item.id)),
  }
}
