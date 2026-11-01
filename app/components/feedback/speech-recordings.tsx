'use client'
import { useEffect, useState } from 'react'

interface Recording {
  id: string
  userId: string | null
  durationMs: number
  byteLength: number
  sha256: string
  status: 'processing' | 'success' | 'failed' | 'cancelled'
  transcript: string | null
  locales: string[]
  errorMessage: string | null
  createdAt: string
}
interface Page { items: Recording[], nextOffset: number | null }
const statuses = { processing: '处理中', success: '转写成功', failed: '转写失败', cancelled: '已取消转写' }
export default function SpeechRecordings({ version }: { version: number }) {
  const [page, setPage] = useState<Page>({ items: [], nextOffset: null })
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState('')
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true); setError(''); setPlaying(''); setPage({ items: [], nextOffset: null })
    fetch(`/api/feedback/speech?offset=${offset}`, { cache: 'no-store', signal: abort.signal })
      .then(async response => {
        if (!response.ok) { throw new Error(response.status === 403 ? '无管理员权限' : '录音记录读取失败，请重试') }
        const data = await response.json()
        if (!abort.signal.aborted) { setPage(data) }
      })
      .catch(error => { if (!abort.signal.aborted) { setError(error.message) } })
      .finally(() => { if (!abort.signal.aborted) { setLoading(false) } })
    return () => abort.abort()
  }, [offset, version])
  const button = 'min-h-11 rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-40'
  return <section aria-label='语音录音' className='space-y-4'>
    <h2 className='text-lg font-semibold'>语音录音</h2>
    <p className='text-sm text-gray-600'>提交给语音服务的原始 WAV 与转写保存在反馈数据库中；成功、失败及提交后取消的记录均可核对。识别文字是发送前的原始转写，可能与用户最终发送的文字不同。</p>
    {error && <p role='alert' className='text-red-700'>{error}</p>}
    {loading ? <p role='status'>正在读取录音…</p> : !page.items.length && <p>暂无录音记录</p>}
    {page.items.map(item => <article key={item.id} className='space-y-3 rounded-lg border border-gray-200 bg-white p-4'>
      <h3 className='font-semibold'>{statuses[item.status]} · {(item.durationMs / 1000).toFixed(1)} 秒</h3>
      <p className='break-all text-sm text-gray-600'>{new Date(item.createdAt).toLocaleString('zh-CN')} · {item.userId || '游客'} · {item.id}</p>
      <p className='whitespace-pre-wrap break-words'><strong>原始转写：</strong>{item.transcript || '暂无转写文字'}</p>
      {item.errorMessage && <p className='text-red-700'>{item.errorMessage}</p>}
      <p className='break-all text-xs text-gray-500'>自动识别标签：{item.locales.join('、') || '未返回'} · WAV / 16kHz / 单声道 · {(item.byteLength / 1024).toFixed(1)} KB</p>
      {playing === item.id
        ? <audio controls preload='none' aria-label={`播放录音 ${item.id}`} src={`/api/feedback/speech/${item.id}`} onError={() => setError('录音播放失败，请确认管理员登录仍有效并重试')} className='w-full max-w-lg' />
        : <button type='button' className={button} onClick={() => { setError(''); setPlaying(item.id) }}>加载录音</button>}
    </article>)}
    <div className='flex gap-3'>
      <button type='button' className={button} disabled={loading || offset === 0} onClick={() => setOffset(n => Math.max(0, n - 50))}>上一页录音</button>
      <button type='button' className={button} disabled={loading || page.nextOffset === null} onClick={() => setOffset(page.nextOffset!)}>下一页录音</button>
    </div>
  </section>
}
