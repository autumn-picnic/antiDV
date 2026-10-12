'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { quickEscape } from '@/app/components/quick-exit'

export default function GuestLoginPrompt({ onContinue }: { onContinue: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return <dialog ref={dialog} aria-labelledby='guest-login-title' aria-describedby='guest-login-description' onCancel={(event) => { event.preventDefault(); onContinue() }} className='max-h-[90dvh] w-[min(92vw,440px)] overflow-y-auto rounded-2xl bg-[#FBF9F6] p-5 text-[#3D3028] shadow-xl backdrop:bg-black/30 sm:p-6'>
    <div className='flex items-start justify-between gap-3'>
      <h2 id='guest-login-title' className='pt-2 text-lg font-semibold'>邀请你注册小安</h2>
      <button type='button' onClick={quickEscape} className='min-h-11 shrink-0 rounded-lg px-2 text-sm underline'>快速离开</button>
    </div>
    <p id='guest-login-description' className='mt-3 text-sm leading-7'>如果你愿意，可以注册一个账号。现在暂时不想注册，也可以继续和小安聊聊。</p>
    <div className='mt-6 flex flex-col gap-3'>
      <Link href='/sign-up' onClick={onContinue} className='flex min-h-11 items-center justify-center rounded-lg bg-[#95684D] px-4 py-3 text-sm font-medium text-white hover:bg-[#80583F]'>注册 / 登录</Link>
      <button type='button' onClick={onContinue} className='min-h-11 rounded-lg border border-[#95684D] bg-white px-4 py-3 text-sm font-medium hover:bg-[#FFF1E5]'>先不注册，继续聊聊</button>
    </div>
  </dialog>
}
