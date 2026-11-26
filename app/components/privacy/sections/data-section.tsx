import { useEffect, useState } from 'react'
import { ChatApiError } from '@/service'
import { expiryText } from '@/service/privacy'
import { buttonClass } from '../privacy-form-styles'

const kinds = { contact: '留言', failures: '出错记录', recordings: '语音录音' }
type Kind = keyof typeof kinds
type RecordSummary = { id: string, createdAt: string, preview?: string, durationMs?: number }

async function dataRequest(path: string, signal: AbortSignal, remove = false) {
  const response = await fetch(`/v1/me/data${path}`, {
    signal, credentials: 'same-origin', cache: 'no-store',
    ...(remove ? { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'DELETE' }) } : {}),
  })
  if (!response.ok) { throw new ChatApiError(response.status, '记录暂时无法读取或删除，请刷新后重试。') }
  return response.json()
}

export default function DataSection({ reload, disabled, mutate }: {
  reload: number, disabled: boolean, mutate: (action: (signal: AbortSignal) => Promise<void>) => Promise<void>,
}) {
  const [kind, setKind] = useState<Kind>('contact')
  const [offset, setOffset] = useState(0)
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<{ items: RecordSummary[], nextOffset: number | null } | null>(null)
  const [error, setError] = useState(false)
  const [confirmation, setConfirmation] = useState<string | 'all' | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError(false)
    void dataRequest(`/${kind}?offset=${offset}`, controller.signal).then(value => {
      if (!controller.signal.aborted) { setData(value) }
    }).catch(() => {
      if (!controller.signal.aborted) { setError(true) }
    })
    return () => controller.abort()
  }, [kind, reload, offset, version])

  return <section className='mt-6 space-y-3 border-t border-[#E6DDD5] pt-4' aria-labelledby='my-data-title'>
    <h3 id='my-data-title' className='font-semibold'>我的数据</h3>
    <label className='block text-sm'>记录类型{' '}
      <select className={buttonClass} value={kind} disabled={disabled} onChange={event => {
        setKind(event.target.value as Kind); setOffset(0); setConfirmation(null)
      }}>{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </label>
    {error ? <p role='alert' className='text-sm'>读取失败，请刷新状态。</p>
      : !data ? <p role='status' className='text-sm'>正在读取记录…</p>
        : !data.items.length ? <p className='text-sm'>没有可管理的{kinds[kind]}。</p>
          : <>
            <ul className='space-y-2'>{data.items.map(item => <li key={item.id} className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E6DDD5] p-2 text-sm'>
              <span className='break-all'>{expiryText(Date.parse(item.createdAt) / 1000)}{item.preview ? ` · ${item.preview}` : ''}{item.durationMs == null ? '' : ` · ${Math.round(item.durationMs / 1000)} 秒`}</span>
              <button type='button' className={buttonClass} disabled={disabled || !!confirmation} onClick={() => setConfirmation(item.id)}>删除此条</button>
            </li>)}</ul>
            <button type='button' className={buttonClass} disabled={disabled || !!confirmation} onClick={() => setConfirmation('all')}>删除全部{kinds[kind]}</button>
          </>}
    {confirmation && <div className='space-y-2' aria-label='确认删除记录'>
      <p className='text-sm'>确认删除{confirmation === 'all' ? '全部' : '这条'}{kinds[kind]}？已删除的数据仍可能在数据库恢复副本中保留至备份到期。</p>
      <button type='button' autoFocus className={buttonClass} disabled={disabled} onClick={() => setConfirmation(null)}>取消</button>{' '}
      <button type='button' className={buttonClass} disabled={disabled} onClick={() => void mutate(async (signal) => {
        await dataRequest(`/${kind}${confirmation === 'all' ? '' : `/${encodeURIComponent(confirmation)}`}`, signal, true)
        if (!signal.aborted) { setConfirmation(null); setOffset(0); setVersion(value => value + 1) }
      })}>确认删除</button>
    </div>}
    {(offset > 0 || data?.nextOffset != null) && <div className='flex gap-2'>
      <button type='button' className={buttonClass} disabled={disabled || !!confirmation || offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))}>上一页</button>
      <button type='button' className={buttonClass} disabled={disabled || !!confirmation || data?.nextOffset == null} onClick={() => { if (data?.nextOffset != null) { setOffset(data.nextOffset) } }}>下一页</button>
    </div>}
  </section>
}
