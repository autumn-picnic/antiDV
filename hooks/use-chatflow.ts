'use client'
import { useEffect, useRef, useState } from 'react'
import { createStreamRenderer } from '../utils/stream-renderer'
import { ChatApiError, createConversation, deleteConversation, fetchConversation, fetchConversations, fetchCurrentConversation, sendChatMessage, fetchReviews, saveReview, saveChatFailure } from '../service'
import type { ConversationItem } from '../types/app'
import type { ConversationView, DebugChatItem, GuardDiagnostic } from '../types/chatflow'

function chatItems(view: ConversationView): DebugChatItem[] {
  return view.turns.flatMap((turn, index) => {
    const id = turn.response_id || `${view.conversation_id}-${turn.number ?? index}`
    return [
      { id: `question-${id}`, content: turn.user, isAnswer: false },
      { id, content: turn.assistant, isAnswer: true, safetyLevel: turn.safety_level, debug: turn.debug },
    ]
  })
}

function errorMessage(error: unknown) {
  return error instanceof ChatApiError ? error.message : '暂时无法连接小安，请稍后重试'
}

interface Failure { message: string, query?: string, conversationId?: string, responseId?: string, needsRecovery?: boolean, guard?: GuardDiagnostic, attemptId?: string }

export default function useChatflow({ authReady, signedIn, onCompleted }: { authReady: boolean, signedIn: boolean, onCompleted: () => void }) {
  const [conversationList, setConversationList] = useState<ConversationItem[]>([])
  const [conversationId, setConversationId] = useState('-1')
  const [chatList, setChatList] = useState<DebugChatItem[]>([])
  const [busy, setBusy] = useState(true)
  const [isResponding, setResponding] = useState(false)
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [failure, setFailure] = useState<Failure | null>(null)
  const lock = useRef(true)
  const controller = useRef<AbortController | null>(null)
  const renderer = useRef<ReturnType<typeof createStreamRenderer> | null>(null)
  const cancelSend = useRef<(() => void) | null>(null)
  const mounted = useRef(true)

  async function refreshList(signal?: AbortSignal) {
    const rows = await fetchConversations(signal)
    if (mounted.current && !signal?.aborted) {
      setConversationList(rows.map(row => ({
        id: row.id,
        name: `对话 ${row.id.slice(0, 8)}`,
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
    setConversationList([])
    setConversationId('-1')
    setChatList([])
    setFailure(null)
    const abort = new AbortController()
    controller.current = abort
    let active = true
    async function init() {
      try {
        const rows = await refreshList(abort.signal)
        const current = await fetchCurrentConversation(abort.signal) || (rows[0] ? await fetchConversation(rows[0].id, abort.signal) : null)
        if (active && current) {
          setConversationId(current.conversation_id)
          setChatList(chatItems(current))
        }
      }
      catch (error) {
        if (active) { setFailure({ message: errorMessage(error) }) }
      }
      finally {
        if (active) { lock.current = false; setBusy(false) }
      }
    }
    void init()
    return () => { active = false; mounted.current = false; controller.current?.abort(); renderer.current?.cancel() }
  }, [authReady, signedIn])

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
    if (lock.current || !chatList.some(item => item.isAnswer && item.id === responseId)) { throw new Error('请等待回答完成后再评价') }
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
    if (!start()) { return }
    try {
      if (id === '-1') { setConversationId('-1'); setChatList([]); return }
      const view = await fetchConversation(id, controller.current!.signal)
      if (mounted.current) { setConversationId(id); setChatList(chatItems(view)) }
    }
    catch (error) {
      if (mounted.current) {
        if (error instanceof ChatApiError && error.status === 404) {
          setConversationId('-1'); setChatList([])
          setConversationList(list => list.filter(item => item.id !== id))
        }
        setFailure({ message: errorMessage(error) })
      }
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
      setConversationList(list => [{ id: created.conversation_id, name: `对话 ${created.conversation_id.slice(0, 8)}`, inputs: null, introduction: '' }, ...list])
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
    cancelSend.current = () => {
      abort.abort()
      streamRenderer?.cancel()
      controller.current = null
      renderer.current = null
      cancelSend.current = null
      setChatList(committed)
      setFailure(null)
      finish()
    }
    let id = conversationId
    let responseId: string | undefined
    let startedGeneration = false
    const attemptId = crypto.randomUUID()
    const pendingId = `pending-${Date.now()}`
    let text = ''
    try {
      if (id === '-1') {
        const created = await createConversation(abort.signal)
        id = created.conversation_id
        if (!isActive()) { return }
        setConversationId(id)
        setConversationList(list => [{ id, name: `对话 ${id.slice(0, 8)}`, inputs: null, introduction: '' }, ...list])
      }
      const question: DebugChatItem = { id: `question-${pendingId}`, content: message, isAnswer: false }
      setChatList([...committed, question, { id: pendingId, content: '', isAnswer: true }])
      streamRenderer = createStreamRenderer((delta) => {
        text += delta
        if (isActive()) { setChatList([...committed, question, { id: pendingId, content: text, isAnswer: true }]) }
      })
      renderer.current = streamRenderer
      startedGeneration = true
      const completed = await sendChatMessage(id, message, {
        onStart: (value) => { if (isActive()) { responseId = value } },
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
        isAnswer: true,
        safetyLevel: completed.safety_level,
        debug: completed.debug,
      }])
      onCompleted()
    }
    catch (error) {
      if (!isActive()) { return }
      streamRenderer?.cancel()
      // Remove both pending entries: neither may be exported or treated as committed history.
      setChatList(committed)
      const expired = error instanceof ChatApiError && error.status === 404
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
        needsRecovery: startedGeneration && !expired,
        guard: error instanceof ChatApiError ? error.guard : undefined,
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
      const committed = failed.responseId && view?.turns.some(turn => turn.response_id === failed.responseId)
      if (failed.query && !committed) {
        setFailure({ ...failed, message: '已刷新记录。请核对是否已有回复，再决定是否重试。', needsRecovery: false })
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
      }
    }
    catch (error) {
      if (mounted.current) { setFailure({ message: `部分删除未完成：${errorMessage(error)}` }) }
    }
    finally {
      if (mounted.current) {
        setConversationList(list => list.filter(item => !removed.has(item.id)))
        if (removed.has(conversationId)) { setConversationId('-1'); setChatList([]) }
      }
      finish()
    }
  }

  return {
    prepareConversation,
    debugEnabled,
    setDebugEnabled,
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
