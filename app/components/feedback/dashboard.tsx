'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import DebugPanel from '@/app/components/chat/debug-panel'
import type { ChatDebug } from '@/types/chatflow'
import SpeechRecordings from './speech-recordings'
import { collectFeedbackExport, collectSelectedFeedbackExport, downloadFeedbackWorkbook } from './export'
import type { ExportConversation, ExportFailure } from './export'

interface RequestContext { started_at?: number, completed_at?: number, ip?: string, country?: string, region?: string, city?: string }
interface UserGroup { userId: string | null, conversationCount: number }
interface Turn { reasoning?: string, debug?: ChatDebug, requestContext?: RequestContext, number: number, responseId: string, question: string, answer: string, score: number | null, comment: string | null }
interface Contact { id: string, createdAt: string, message: string, name: string | null, phone: string | null, wechat: string | null, email: string | null }
interface Page<T> { items: T[], nextOffset: number | null }

function formatTime(value?: number) {
  return value ? `${new Date(value * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Hong_Kong', hour12: false })} (UTC+8)` : '未记录'
}

function locationLabel(context?: RequestContext) {
  return [context?.country, context?.region, context?.city].filter(Boolean).map(value => {
    try { return decodeURIComponent(value!) } catch { return value }
  }).join(' / ') || '未取得'
}

async function readPage<T>(query: string, signal?: AbortSignal): Promise<Page<T>> {
  const response = await fetch(`/api/feedback?${query}`, { cache: 'no-store', signal })
  if (!response.ok) {
    throw new Error([401, 403].includes(response.status) ? '无管理员权限' : '记录读取失败，请重试')
  }
  return response.json()
}

function useFeedbackPage<T>(query: string | null, version: number) {
  const [result, setResult] = useState<{ query: string, version: number, page?: Page<T>, error?: string }>()
  useEffect(() => {
    if (query === null) { return }
    const abort = new AbortController()
    readPage<T>(query, abort.signal)
      .then((page) => { if (!abort.signal.aborted) { setResult({ query, version, page }) } })
      .catch((error) => { if (!abort.signal.aborted) { setResult({ query, version, error: error.message }) } })
    return () => abort.abort()
  }, [query, version])
  const current = result?.query === query && result.version === version ? result : undefined
  return {
    page: current?.page ?? { items: [], nextOffset: null },
    error: current?.error,
    loading: query !== null && !current,
  }
}

const button = 'min-h-11 rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-40 focus-visible:outline focus-visible:outline-2'
const turnQuery = (id: string, offset: number) => `conversationId=${encodeURIComponent(id)}&offset=${offset}`

function Pagination({ offset, nextOffset, onChange }: { offset: number, nextOffset: number | null, onChange: (offset: number) => void }) {
  return <div className='mt-4 flex gap-3'>
    <button type='button' className={button} disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - 50))}>上一页</button>
    <button type='button' className={button} disabled={nextOffset === null} onClick={() => { if (nextOffset !== null) { onChange(nextOffset) } }}>下一页</button>
  </div>
}

export default function FeedbackDashboard() {
  const [group, setGroup] = useState<UserGroup | null>(null)
  const [userOffset, setUserOffset] = useState(0)
  const [checked, setChecked] = useState<Map<string, ExportConversation>>(() => new Map())
  const [selected, setSelected] = useState('')
  const [listOffset, setListOffset] = useState(0)
  const [turnOffset, setTurnOffset] = useState(0)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState('')
  const [section, setSection] = useState<'chat' | 'contact' | 'speech'>('chat')
  const [contacts, setContacts] = useState<Page<Contact>>({ items: [], nextOffset: null })
  const [contactOffset, setContactOffset] = useState(0)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [failures, setFailures] = useState<Page<ExportFailure>>({ items: [], nextOffset: null })
  const [failureOffset, setFailureOffset] = useState(0)
  const [loadingFailures, setLoadingFailures] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const exportController = useRef<AbortController | null>(null)
  useEffect(() => () => exportController.current?.abort(), [])
  async function download(selectedConversations?: ExportConversation[]) {
    if (section === 'speech') { return }
    if (exportController.current) { return }
    const controller = new AbortController()
    exportController.current = controller
    setExporting(true)
    setError('')
    try {
      const tables = selectedConversations
        ? await collectSelectedFeedbackExport(selectedConversations, controller.signal, setExportStatus)
        : await collectFeedbackExport(section, controller.signal, setExportStatus)
      controller.signal.throwIfAborted()
      setExportStatus('正在生成 Excel…')
      await downloadFeedbackWorkbook(tables, section, controller.signal)
      setExportStatus('Excel 已生成并开始下载')
    }
    catch (error) {
      if (controller.signal.aborted) { setExportStatus('已取消导出') }
      else { setError(error instanceof Error ? error.message : '导出失败，请重试'); setExportStatus('') }
    }
    finally { exportController.current = null; setExporting(false) }
  }
  const users = useFeedbackPage<UserGroup>(section !== 'chat' || group ? null : `view=users&offset=${userOffset}`, version)
  const conversations = useFeedbackPage<ExportConversation>(section === 'chat' && group ? `userId=${encodeURIComponent(group.userId ?? '')}&offset=${listOffset}` : null, version)
  const turns = useFeedbackPage<Turn>(section === 'chat' && selected ? turnQuery(selected, turnOffset) : null, version)

  const changeGroup = (next: UserGroup | null) => {
    setGroup(next)
    setListOffset(0)
    setSelected('')
    setTurnOffset(0)
  }

  useEffect(() => {
    if (section !== 'contact') { return }
    const abort = new AbortController()
    setLoadingContacts(true)
    setContacts({ items: [], nextOffset: null })
    setError('')
    fetch(`/api/contact?offset=${contactOffset}`, { cache: 'no-store', signal: abort.signal })
      .then(async response => {
        if (!response.ok) { throw new Error(response.status === 403 ? '无管理员权限' : '留言读取失败，请重试') }
        const data = await response.json()
        if (!abort.signal.aborted) { setContacts(data) }
      })
      .catch(error => { if (!abort.signal.aborted) { setError(error.message) } })
      .finally(() => { if (!abort.signal.aborted) { setLoadingContacts(false) } })
    return () => abort.abort()
  }, [section, contactOffset, version])
  useEffect(() => {
    if (section !== 'chat') { return }
    const abort = new AbortController()
    setLoadingFailures(true)
    setFailures({ items: [], nextOffset: null })
    fetch(`/api/feedback/failures?offset=${failureOffset}`, { cache: 'no-store', signal: abort.signal })
      .then(async response => {
        if (!response.ok) { throw new Error(response.status === 403 ? '无管理员权限' : '失败记录读取失败，请重试') }
        const data = await response.json()
        if (!abort.signal.aborted) { setFailures(data) }
      })
      .catch(error => { if (!abort.signal.aborted) { setError(error.message) } })
      .finally(() => { if (!abort.signal.aborted) { setLoadingFailures(false) } })
    return () => abort.abort()
  }, [section, failureOffset, version])
  const list = group ? conversations : users
  return <main className='min-h-screen bg-[#FBF8F4] p-6 text-gray-900'>
    <div className='mb-6 flex flex-wrap items-center gap-5'>
      <h1 className='text-xl font-semibold'>小安 · 对话与反馈管理</h1>
      <Link href='/chat' className='underline'>回到聊天</Link>
      <button type='button' className={button} onClick={() => setVersion(v => v + 1)}>刷新</button>
      {section !== 'speech' && <button type='button' disabled={exporting} className={button} onClick={() => void download()}>{exporting ? '正在导出…' : `下载${section === 'chat' ? '聊天评价' : '在线留言'} Excel（全部记录）`}</button>}
      {exporting && <button type='button' className={button} onClick={() => exportController.current?.abort()}>取消导出</button>}
    </div>
    {exportStatus && <p role='status' className='mb-4 text-sm text-gray-700'>{exportStatus}</p>}
    <div className='mb-6 flex gap-2 border-b border-gray-200' role='group' aria-label='反馈类型'>
      <button type='button' aria-pressed={section === 'chat'} className={`${button} min-h-11 rounded-b-none border-b-2 ${section === 'chat' ? 'border-orange-700 bg-orange-50' : 'border-transparent bg-white'}`} onClick={() => { setError(''); setSection('chat') }}>聊天评价</button>
      <button type='button' aria-pressed={section === 'contact'} className={`${button} min-h-11 rounded-b-none border-b-2 ${section === 'contact' ? 'border-orange-700 bg-orange-50' : 'border-transparent bg-white'}`} onClick={() => { setError(''); setSection('contact') }}>在线留言</button>
      <button type='button' aria-pressed={section === 'speech'} className={`${button} min-h-11 rounded-b-none border-b-2 ${section === 'speech' ? 'border-orange-700 bg-orange-50' : 'border-transparent bg-white'}`} onClick={() => { setError(''); setSection('speech') }}>语音录音</button>
    </div>
    {error && <p role='alert' className='mb-4 text-red-700'>{error}</p>}
    {section === 'chat' && <>
    <div className='mb-6 flex flex-wrap items-center gap-3 border-b border-gray-200 pb-4'>
      <button type='button' className={`${button} inline-flex items-center gap-2 bg-white`} disabled={!checked.size || exporting} onClick={() => void download(Array.from(checked.values()))}>
        <ArrowDownTrayIcon aria-hidden='true' className='size-4 shrink-0' />
        下载所选会话 (.xlsx)
      </button>
      <span aria-live='polite' className='text-sm text-gray-600'>已选 {checked.size} 个会话</span>
      {checked.size > 0 && <button type='button' className={button} disabled={exporting} onClick={() => { setChecked(new Map()) }}>清空选择</button>}
    </div>
    <div className='grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]'>
      <section aria-label={group ? '会话列表' : '用户列表'} className='min-w-0'>
        {group && <button type='button' className={`${button} mb-3`} onClick={() => changeGroup(null)}>返回用户列表</button>}
        <h2 className='mb-3 break-all text-sm font-semibold'>{group ? group.userId ?? '游客' : '用户列表'}</h2>
        {list.error && <p role='alert' className='text-red-700'>{list.error}</p>}
        {list.loading && <p role='status'>正在读取…</p>}
        {!list.loading && !list.error && !list.page.items.length && <p>{group ? '本页暂无会话' : '本页暂无用户'}</p>}
        {group
          ? <ul className='space-y-2'>{conversations.page.items.map(item => <li key={item.id} className={`flex rounded border border-gray-300 ${selected === item.id ? 'bg-orange-100' : 'bg-white'}`}>
            <label className='flex min-w-11 shrink-0 cursor-pointer items-center justify-center border-r border-gray-200'>
              <input type='checkbox' className='size-4 accent-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4' aria-label={`选择会话 ${item.id.slice(0, 8)} 下载`} checked={checked.has(item.id)} disabled={exporting} onChange={(event) => {
                const include = event.currentTarget.checked
                setChecked((previous) => {
                  const next = new Map(previous)
                  if (include) { next.set(item.id, item) }
                  else { next.delete(item.id) }
                  return next
                })
              }} />
            </label>
            <button type='button' aria-pressed={selected === item.id} className='min-w-0 flex-1 rounded-r px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2' onClick={() => { setSelected(item.id); setTurnOffset(0) }}>
              <span className='block font-medium'>会话 {item.id.slice(0, 8)}</span>
              <span className='block text-xs'>创建时间：{formatTime(item.createdAt)}</span>
              <span className='block text-xs'>{item.turnCount} 轮对话 · {item.reviewCount} 条评价</span>
            </button>
          </li>)}</ul>
          : <ul className='space-y-2'>{users.page.items.map(item => <li key={item.userId ?? ''}>
            <button type='button' className={`${button} w-full bg-white text-left`} onClick={() => changeGroup(item)}>
              <span className='block break-all font-medium'>{item.userId ?? '游客'}</span>
              <span className='block text-xs text-gray-600'>{item.conversationCount} 个会话</span>
            </button>
          </li>)}</ul>}
        <Pagination offset={group ? listOffset : userOffset} nextOffset={list.page.nextOffset} onChange={group ? setListOffset : setUserOffset} />
      </section>
      <section aria-label='对话与评价' className='min-w-0'>
        {selected && <h2 className='mb-3 font-semibold'>会话 {selected.slice(0, 8)}</h2>}
        {turns.error && <p role='alert' className='text-red-700'>{turns.error}</p>}
        {turns.loading && <p role='status'>正在读取对话…</p>}
        {selected && !turns.loading && !turns.error && !turns.page.items.length && <p>本页没有已完成的对话轮次。</p>}
        {turns.page.items.map(turn => <article key={turn.responseId} className='mb-5 rounded-lg border border-gray-200 bg-white p-4'>
          <h2 className='font-semibold'>第 {turn.number} 轮</h2>
          <dl className='mt-2 space-y-1 break-words text-sm text-gray-600'>
            <div><dt className='inline'>对话开始：</dt><dd className='inline'>{formatTime(turn.requestContext?.started_at)}</dd></div>
            <div><dt className='inline'>回答完成：</dt><dd className='inline'>{formatTime(turn.requestContext?.completed_at)}</dd></div>
            <div><dt className='inline'>用户 IP：</dt><dd className='inline'>{turn.requestContext?.ip || '未取得'}</dd></div>
            <div><dt className='inline'>IP 推测地点：</dt><dd className='inline'>{locationLabel(turn.requestContext)}</dd></div>
          </dl>
          {turn.reasoning && (
            <details className='mt-3 rounded-lg border border-gray-200 text-sm text-gray-600'>
              <summary className='min-h-11 cursor-pointer px-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600'>推理过程</summary>
              <div className='max-h-80 overflow-y-auto whitespace-pre-wrap break-words border-t border-gray-200 px-3 py-3'>{turn.reasoning}</div>
            </details>
          )}
          {turn.debug ? <DebugPanel debug={turn.debug} /> : <p className='mt-2 text-sm text-gray-600'>本轮未留存 Debug 数据</p>}
          <p className='mt-3 whitespace-pre-wrap break-words'><strong>用户：</strong>{turn.question}</p>
          <p className='mt-3 whitespace-pre-wrap break-words'><strong>小安：</strong>{turn.answer}</p>
          <div className='mt-4 border-t pt-3'>
            <p>{turn.score === null ? '尚未评价' : `用户评分：${turn.score} / 5`}</p>
            {turn.comment && <p className='mt-2 whitespace-pre-wrap break-words'>改进建议：{turn.comment}</p>}
          </div>
        </article>)}
        {selected && <Pagination offset={turnOffset} nextOffset={turns.page.nextOffset} onChange={setTurnOffset} />}
      </section>
    </div>
    <section aria-label='失败会话记录' className='mt-8 space-y-4'>
      <h2 className='text-lg font-semibold'>失败会话记录</h2>
      <p className='text-sm text-gray-600'>保存未成功请求的用户输入，并将失败原因记录为评价。以下为浏览器失败报告，包含尚未建立会话的请求。</p>
      {loadingFailures ? <p role='status'>正在读取失败记录…</p> : !failures.items.length && <p>暂无失败记录</p>}
      {failures.items.map(item => <article key={item.id} className='rounded-lg border border-gray-200 bg-white p-4'>
        <h3 className='font-semibold'>{item.stage === 'create_conversation' ? '建立会话失败' : '生成回答失败'}</h3>
        <p className='mt-2 break-all text-xs text-gray-500'>{new Date(item.createdAt).toLocaleString('zh-CN')} · {item.userId || '游客'} · 会话：{item.conversationId || '尚未建立'}</p>
        <p className='mt-3 whitespace-pre-wrap break-words'><strong>用户：</strong>{item.question}</p>
        <p className='mt-3 whitespace-pre-wrap break-words'><strong>评价（失败原因）：</strong>{item.comment}</p>
        <p className='mt-2 break-all text-sm text-gray-600'>错误状态：{item.status || '未取得状态'}{item.code && ` · 错误代码：${item.code}`}</p>
      </article>)}
      <div className='flex gap-3'>
        <button type='button' className={button} disabled={loadingFailures || failureOffset === 0} onClick={() => setFailureOffset(n => Math.max(0, n - 50))}>上一页失败记录</button>
        <button type='button' className={button} disabled={loadingFailures || failures.nextOffset === null} onClick={() => setFailureOffset(failures.nextOffset!)}>下一页失败记录</button>
      </div>
    </section></>}
    {section === 'speech' && <SpeechRecordings version={version} />}
    {section === 'contact' && <section aria-label='在线留言' className='space-y-4'>
      {loadingContacts ? <p role='status'>正在读取…</p> : !contacts.items.length && <p>暂无在线留言</p>}
      {contacts.items.map(contact => <article key={contact.id} className='rounded-lg border border-gray-200 bg-white p-4'>
        <div className='flex flex-wrap justify-between gap-2 break-all text-xs text-gray-500'><time dateTime={contact.createdAt}>{new Date(contact.createdAt).toLocaleString('zh-CN')}</time><span>{contact.id}</span></div>
        <p className='mt-3 whitespace-pre-wrap break-words'>{contact.message}</p>
        {(contact.name || contact.phone || contact.wechat || contact.email) && <dl className='mt-4 grid gap-1 break-words border-t pt-3 text-sm sm:grid-cols-[auto_1fr]'>
          {contact.name && <><dt className='font-medium'>姓名</dt><dd>{contact.name}</dd></>}
          {contact.phone && <><dt className='font-medium'>手机</dt><dd>{contact.phone}</dd></>}
          {contact.wechat && <><dt className='font-medium'>微信</dt><dd>{contact.wechat}</dd></>}
          {contact.email && <><dt className='font-medium'>邮箱</dt><dd>{contact.email}</dd></>}
        </dl>}
      </article>)}
      <div className='flex gap-3'>
        <button type='button' className={button} disabled={loadingContacts || contactOffset === 0} onClick={() => setContactOffset(n => Math.max(0, n - 50))}>上一页</button>
        <button type='button' className={button} disabled={loadingContacts || contacts.nextOffset === null} onClick={() => setContactOffset(contacts.nextOffset!)}>下一页</button>
      </div>
    </section>}
  </main>
}
