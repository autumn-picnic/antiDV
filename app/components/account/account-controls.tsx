'use client'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { isFeedbackAdminEmail } from '@/lib/auth/policy'
import { quickEscape } from '@/app/components/quick-exit'

export default function AccountControls({ onOpenPrivacy, onOpenMemory }: { onOpenPrivacy: () => void, onOpenMemory: () => void }) {
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
  const menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) { menu.current.open = false }
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  return <details ref={menu} className="chat-account-menu" onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.currentTarget.open) {
      event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false
      event.currentTarget.querySelector('summary')?.focus()
    }
  }}>
    <summary aria-label={isSignedIn ? '账号菜单' : '账号菜单：登录或注册'}>
      {isSignedIn && user?.imageUrl
        ? <img src={user.imageUrl} alt="" width={32} height={32} />
        : <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>}
    </summary>
    <div className="chat-account-popover">
      <p>{!isLoaded ? '正在加载账号…' : isSignedIn ? `已登录${user?.firstName ? `：${user.firstName}` : ''}` : '正在以游客身份聊天'}</p>
      {isLoaded && !isSignedIn && <><Link href="/sign-in">登录</Link><Link href="/sign-up">注册</Link></>}
      <button type="button" disabled={!isLoaded} onClick={() => { if (menu.current) { menu.current.open = false }; onOpenPrivacy() }}>隐私与保存</button>
      {isSignedIn && <>
        <button type="button" onClick={() => { if (menu.current) { menu.current.open = false }; onOpenMemory() }}>记忆管理</button>
        <button type="button" disabled={busy} onClick={() => void claim()}>将本设备旧游客记录关联到账号</button>
        {user?.publicMetadata.role === 'admin' && isFeedbackAdminEmail(user.primaryEmailAddress?.emailAddress, user.primaryEmailAddress?.verification?.status === 'verified') && <Link href="/feedback">反馈管理</Link>}
        <button type="button" onClick={quickEscape}>退出并清除此设备登录</button>
      </>}
      {status && <p role="status">{status}</p>}
    </div>
  </details>
}
