'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { collectFeedbackExport, downloadFeedbackWorkbook } from './export'
import type { ExportFailure } from './export'

interface Summary { id: string, userId: string | null, turnCount: number, reviewCount: number }
interface Turn { number: number, responseId: string, question: string, answer: string, score: number | null, comment: string | null }
interface Contact { id: string, createdAt: string, message: string, name: string | null, phone: string | null, wechat: string | null, email: string | null }
interface Page<T> { items: T[], nextOffset: number | null }

export default function FeedbackDashboard() {
  const [conversations, setConversations] = useState<Page<Summary>>({ items: [], nextOffset: null })
  const [turns, setTurns] = useState<Page<Turn>>({ items: [], nextOffset: null })
  const [selected, setSelected] = useState('')
  const [listOffset, setListOffset] = useState(0)
  const [turnOffset, setTurnOffset] = useState(0)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingTurns, setLoadingTurns] = useState(false)
  const [section, setSection] = useState<'chat' | 'contact'>('chat')
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
  async function download() {
    if (exportController.current) { return }
    const controller = new AbortController()
    exportController.current = controller
    setExporting(true)
    setError('')
    try {
      const tables = await collectFeedbackExport(section, controller.signal, setExportStatus)
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
  useEffect(() => {
    if (section !== 'chat') { return }
    const abort = new AbortController()
    setLoadingList(true)
    setConversations({ items: [], nextOffset: null })
    setError('')
    fetch(`/api/feedback?offset=${listOffset}`, { cache: 'no-store', signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) { throw new Error(response.status === 403 ? '无管理员权限' : '记录读取失败，请重试') }
        const data = await response.json()
        if (!abort.signal.aborted) { setConversations(data) }
      })
      .catch((err) => { if (!abort.signal.aborted) { setError(err.message) } })
      .finally(() => { if (!abort.signal.aborted) { setLoadingList(false) } })
    return () => abort.abort()
  }, [section, listOffset, version])
  useEffect(() => {
    setTurns({ items: [], nextOffset: null })
    if (section !== 'chat' || !selected) { return }
    const abort = new AbortController()
    setLoadingTurns(true)
    setError('')
    fetch(`/api/feedback?conversationId=${encodeURIComponent(selected)}&offset=${turnOffset}`, { cache: 'no-store', signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) { throw new Error(response.status === 403 ? '无管理员权限' : '对话读取失败，请重试') }
        const data = await response.json()
        if (!abort.signal.aborted) { setTurns(data) }
      })
      .catch((err) => { if (!abort.signal.aborted) { setError(err.message) } })
      .finally(() => { if (!abort.signal.aborted) { setLoadingTurns(false) } })
    return () => abort.abort()
  }, [section, selected, turnOffset, version])
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
  const button = 'rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-40 focus-visible:outline focus-visible:outline-2'
  return <main className='min-h-screen bg-[#FBF8F4] p-6 text-gray-900'>
    <div className='mb-6 flex flex-wrap items-center gap-5'>
      <h1 className='text-xl font-semibold'>小安 · 对话与反馈管理</h1>
      <Link href='/chat' className='underline'>回到聊天</Link>
      <button type='button' className={button} onClick={() => setVersion(v => v + 1)}>刷新</button>
      <button type='button' disabled={exporting} className={button} onClick={() => void download()}>{exporting ? '正在导出…' : `下载${section === 'chat' ? '聊天评价' : '在线留言'} Excel（全部记录）`}</button>
      {exporting && <button type='button' className={button} onClick={() => exportController.current?.abort()}>取消导出</button>}
    </div>
    {exportStatus && <p role='status' className='mb-4 text-sm text-gray-700'>{exportStatus}</p>}
    <div className='mb-6 flex gap-2 border-b border-gray-200' role='group' aria-label='反馈类型'>
      <button type='button' aria-pressed={section === 'chat'} className={`${button} min-h-11 rounded-b-none border-b-2 ${section === 'chat' ? 'border-orange-700 bg-orange-50' : 'border-transparent bg-white'}`} onClick={() => { setError(''); setSection('chat') }}>聊天评价</button>
      <button type='button' aria-pressed={section === 'contact'} className={`${button} min-h-11 rounded-b-none border-b-2 ${section === 'contact' ? 'border-orange-700 bg-orange-50' : 'border-transparent bg-white'}`} onClick={() => { setError(''); setSection('contact') }}>在线留言</button>
    </div>
    {error && <p role='alert' className='mb-4 text-red-700'>{error}</p>}
    {section === 'chat' && <><div className='grid gap-6 md:grid-cols-[280px_1fr]'>
      <section aria-label='会话列表'>
        {loadingList ? <p role='status'>正在读取…</p> : !conversations.items.length && <p>暂无可查看会话</p>}
        <ul className='space-y-2'>{conversations.items.map(item => <li key={item.id}>
          <button type='button' className={`${button} w-full text-left ${selected === item.id ? 'bg-orange-100' : 'bg-white'}`} onClick={() => { setSelected(item.id); setTurnOffset(0) }}>
            <span className='block break-all'>会话 {item.id.slice(0, 8)}</span>
            <span className='block break-all text-xs'>{item.userId || '游客'}</span>
            <span className='block text-xs'>{item.turnCount} 轮对话 · {item.reviewCount} 条评价</span>
          </button>
        </li>)}</ul>
        <div className='mt-4 flex gap-3'>
          <button type='button' className={button} disabled={loadingList || listOffset === 0} onClick={() => setListOffset(n => Math.max(0, n - 50))}>上一页</button>
          <button type='button' className={button} disabled={loadingList || conversations.nextOffset === null} onClick={() => setListOffset(conversations.nextOffset!)}>下一页</button>
        </div>
      </section>
      <section aria-label='对话与评价' className='min-w-0'>
        {!selected && <p>选择会话以查看已完成回答和用户反馈。</p>}
        {loadingTurns && <p role='status'>正在读取对话…</p>}
        {selected && !loadingTurns && !turns.items.length && <p>本页没有已完成的对话轮次。</p>}
        {turns.items.map(turn => <article key={turn.responseId} className='mb-5 rounded-lg border border-gray-200 bg-white p-4'>
          <h2 className='font-semibold'>第 {turn.number} 轮</h2>
          <p className='mt-3 whitespace-pre-wrap break-words'><strong>用户：</strong>{turn.question}</p>
          <p className='mt-3 whitespace-pre-wrap break-words'><strong>小安：</strong>{turn.answer}</p>
          <div className='mt-4 border-t pt-3'>
            <p>{turn.score === null ? '尚未评价' : `用户评分：${turn.score} / 5`}</p>
            {turn.comment && <p className='mt-2 whitespace-pre-wrap break-words'>改进建议：{turn.comment}</p>}
          </div>
        </article>)}
        {selected && <div className='flex gap-3'>
          <button type='button' className={button} disabled={loadingTurns || turnOffset === 0} onClick={() => setTurnOffset(n => Math.max(0, n - 50))}>前 50 轮</button>
          <button type='button' className={button} disabled={loadingTurns || turns.nextOffset === null} onClick={() => setTurnOffset(turns.nextOffset!)}>后 50 轮</button>
        </div>}
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
