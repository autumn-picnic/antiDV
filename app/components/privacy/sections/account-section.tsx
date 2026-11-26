import { useEffect, useRef, useState } from 'react'
import { fetchDeletionStatus, requestAccountDeletion } from '@/service/account'
import { buttonClass, inputClass } from '../privacy-form-styles'

const pendingKey = 'xiaoan-account-deletion-pending'
const pollInterval = 5000
const pollLimit = 5 * 60 * 1000

type Phase = 'ready' | 'confirm' | 'submitting' | 'deleting' | 'waiting' | 'deleted' | 'failed'

function pendingOnDevice(value?: boolean) {
  try {
    if (value) { sessionStorage.setItem(pendingKey, '1') }
    return sessionStorage.getItem(pendingKey) === '1'
  }
  catch { return false }
}

export default function AccountSection({ signedIn, disabled }: { signedIn: boolean, disabled: boolean }) {
  const [phase, setPhase] = useState<Phase>(() => pendingOnDevice() ? 'deleting' : 'ready')
  const [confirmation, setConfirmation] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const openButton = useRef<HTMLButtonElement>(null)
  const submission = useRef<AbortController | null>(null)
  const deadline = useRef(Date.now() + pollLimit)

  useEffect(() => () => { submission.current?.abort() }, [])
  useEffect(() => {
    const controller = new AbortController()
    void fetchDeletionStatus(controller.signal).then(status => {
      if (controller.signal.aborted || status === 'active') { return }
      pendingOnDevice(true)
      setPhase(current => current === 'ready' ? status : current)
    }).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => { if (phase === 'confirm') { input.current?.focus() } }, [phase])
  useEffect(() => {
    if (phase !== 'deleting') { return }
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const status = await fetchDeletionStatus(AbortSignal.any([controller.signal, AbortSignal.timeout(pollInterval)]))
        if (controller.signal.aborted) { return }
        if (status === 'deleted') { setPhase('deleted'); return }
        if (status === 'active') {
          try { sessionStorage.removeItem(pendingKey) } catch { /* Storage is optional. */ }
          setPhase('ready')
          return
        }
      }
      catch { if (controller.signal.aborted) { return } }
      if (Date.now() >= deadline.current) { setPhase('waiting'); return }
      timer = setTimeout(poll, pollInterval)
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [phase])

  useEffect(() => {
    if (phase !== 'deleted') { return }
    const timer = setTimeout(async () => {
      try { await fetch('/api/session/clear', { method: 'POST', signal: AbortSignal.timeout(3000) }) }
      catch { /* Continue to the cleared exit screen if the network is unavailable. */ }
      window.location.replace('/exit')
    }, 1500)
    return () => clearTimeout(timer)
  }, [phase])

  async function submit() {
    if (phase !== 'confirm' || confirmation.trim() !== '删除' || disabled || submission.current) { return }
    const controller = new AbortController()
    submission.current = controller
    setPhase('submitting')
    try {
      const status = await requestAccountDeletion(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      if (controller.signal.aborted) { return }
      if (status === 'active') { setPhase('failed'); return }
      pendingOnDevice(true)
      deadline.current = Date.now() + pollLimit
      setPhase(status)
    }
    catch { if (!controller.signal.aborted) { setPhase('failed') } }
    finally { submission.current = null }
  }

  if (!signedIn && (phase === 'ready' || phase === 'confirm')) { return null }
  return <section className='mt-6 border-t border-[#E6DDD5] pt-4' aria-labelledby='account-deletion-title'>
    <h3 id='account-deletion-title' className='font-semibold'>删除账号</h3>
    <p className='mt-2 text-sm leading-6'>删除后将失去登录权限。系统会清除账号下的对话、记忆、授权、评价、留言、出错记录和录音。系统会保留少量账号标记和操作审计记录。备份会按原有周期过期。</p>
    {phase === 'ready' && <button ref={openButton} type='button' className={`${buttonClass} mt-3 text-[#8A2924]`} disabled={disabled} onClick={() => setPhase('confirm')}>删除账号</button>}
    {phase === 'confirm' && <form className='mt-3 space-y-2' onSubmit={event => { event.preventDefault(); void submit() }}>
      <label htmlFor='account-deletion-confirmation' className='block text-sm'>输入「删除」以确认</label>
      <input id='account-deletion-confirmation' ref={input} className={inputClass} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete='off' />
      <div className='flex gap-2'>
        <button type='button' className={buttonClass} onClick={() => { setConfirmation(''); setPhase('ready'); requestAnimationFrame(() => openButton.current?.focus()) }}>取消</button>
        <button type='submit' className={`${buttonClass} text-[#8A2924]`} disabled={disabled || confirmation.trim() !== '删除'}>确认删除</button>
      </div>
    </form>}
    <div role='status' aria-live='polite' className='mt-2 text-sm'>
      {phase === 'submitting' && '正在提交删除请求。'}
      {phase === 'deleting' && '正在删除账号，这可能需要几分钟。'}
      {phase === 'waiting' && '仍在处理。可稍后查询，或发邮件到 support@xiaoan.app。'}
      {phase === 'deleted' && '账号已删除。正在清除此设备的登录凭证。'}
      {phase === 'failed' && '暂时无法确认删除请求。请重试查询，或发邮件到 support@xiaoan.app。'}
    </div>
    {(phase === 'waiting' || phase === 'failed') && <div className='mt-2 flex gap-2'>
      <button type='button' className={buttonClass} onClick={() => { deadline.current = Date.now() + pollLimit; setPhase('deleting') }}>查询状态</button>
      {phase === 'failed' && signedIn && <button type='button' className={buttonClass} disabled={disabled} onClick={() => { setConfirmation(''); setPhase('confirm') }}>重新提交</button>}
    </div>}
  </section>
}
