'use client'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useState } from 'react'
import { quickEscape } from '@/app/components/quick-exit'

export default function AccountControls() {
  const { user, isLoaded, isSignedIn } = useUser()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  async function claim() {
    setBusy(true)
    try {
      const response = await fetch('/v1/me/claim-guest', { method: 'POST', credentials: 'include', cache: 'no-store' })
      if (!response.ok) { throw new Error() }
      const result = await response.json()
      setStatus(`已关联 ${result.claimed_count} 个游客会话，刷新页面后可查看。`)
    }
    catch { setStatus('关联未完成，请稍后重试。') }
    finally { setBusy(false) }
  }
  if (!isLoaded) { return null }
  if (!isSignedIn) {
    return <div className='flex items-center justify-between gap-3 px-4 py-2 text-sm'>
      <span>正在以游客身份聊天</span>
      <div className='flex shrink-0 items-center gap-3'>
        <Link href='/sign-in' className='flex min-h-11 items-center px-2 underline'>登录</Link>
        <Link href='/sign-up' className='flex min-h-11 items-center rounded-lg border border-[#95684D] bg-white px-4 font-medium text-[#80583F] hover:bg-[#FFF1E5]'>注册</Link>
      </div>
    </div>
  }
  return <div className='flex flex-wrap items-center gap-4 px-4 py-2 text-sm'>
    <span>已登录{user?.firstName ? `：${user.firstName}` : ''}</span>
    <button type='button' onClick={quickEscape} className='underline'>退出并清除此设备登录</button>
    <button type='button' disabled={busy} onClick={() => void claim()} className='underline'>将本设备旧游客记录关联到账号</button>
    {user?.publicMetadata.role === 'admin' && <Link href='/feedback' className='underline'>反馈管理</Link>}
    {status && <span role='status'>{status}</span>}
  </div>
}
