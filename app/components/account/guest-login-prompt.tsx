'use client'
import { useRef, useState } from 'react'
import useModalDialog from '@/hooks/use-modal-dialog'
import { useRouter } from 'next/navigation'
import { quickEscape } from '@/app/components/quick-exit'
import { ANALYSIS_CONSENT_TEXT } from '@/lib/privacy/analysis-consent'
import { prepareAnalysisConsent } from '@/service/analysis-consent'

export default function GuestLoginPrompt({ onContinue, conversationId }: { onContinue: () => void, conversationId: string }) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const checkbox = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)
  const [granted, setGranted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useModalDialog(dialog)
  async function register() {
    if (submitting.current) { return }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await prepareAnalysisConsent(granted, conversationId)
      onContinue()
      router.push('/sign-up')
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : '授权选择暂时无法保存，请重试') }
    finally { submitting.current = false; setBusy(false) }
  }
  return <dialog ref={dialog} aria-labelledby='guest-login-title' aria-describedby='guest-login-description' onCancel={(event) => { event.preventDefault(); if (!submitting.current) { onContinue() } }} className='m-auto max-h-[90dvh] w-[min(92vw,440px)] overflow-y-auto rounded-2xl bg-[#FBF9F6] p-5 text-[#3D3028] shadow-xl backdrop:bg-black/30 sm:p-6'>
    <div className='flex flex-col items-start gap-1'>
      <button type='button' onClick={quickEscape} className='min-h-11 self-end rounded-lg px-2 text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#80583F]'>快速离开</button>
      <h2 id='guest-login-title' className='text-balance text-lg font-semibold'>注册账号，继续和小安聊聊</h2>
    </div>
    <label className='mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-[#D5C9BF] bg-white p-3 text-sm leading-7'>
      <input ref={checkbox} data-modal-autofocus type='checkbox' checked={granted} disabled={busy} onChange={event => setGranted(event.target.checked)} aria-describedby='guest-login-description' className='mt-1 h-5 w-5 shrink-0 accent-[#80583F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80583F]' />
      <span>{ANALYSIS_CONSENT_TEXT}</span>
    </label>
    <p id='guest-login-description' className='mt-3 text-sm leading-6 text-[#655449]'>此项为自愿选择，不勾选也可注册或登录。</p>
    {error && <p role='alert' className='mt-3 text-sm leading-6 text-red-800'>{error}</p>}
    <div className='mt-6 flex flex-col gap-3'>
      <button type='button' disabled={busy} onClick={() => void register()} className='flex min-h-11 items-center justify-center rounded-lg bg-[#80583F] px-4 py-3 text-sm font-medium text-white hover:bg-[#6F4B35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80583F] disabled:opacity-60'>{busy ? '正在保存选择…' : '注册 / 登录'}</button>
      <button type='button' disabled={busy} onClick={onContinue} className='min-h-11 rounded-lg border border-[#95684D] bg-white px-4 py-3 text-sm font-medium hover:bg-[#FFF1E5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#80583F] disabled:opacity-60'>暂时不用</button>
    </div>
  </dialog>
}
