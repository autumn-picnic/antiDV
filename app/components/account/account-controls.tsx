'use client'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isFeedbackAdminEmail } from '@/lib/auth/policy'
import { quickEscape } from '@/app/components/quick-exit'

const MAX_NICKNAME_LENGTH = 40

export default function AccountControls({ onOpenPrivacy, onOpenMemory, onRegister, onMenuOpen }: { onMenuOpen?: () => void, onOpenPrivacy: () => void, onOpenMemory: () => void, onRegister: () => void }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const nicknameId = useId()
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null)
  const [nicknameError, setNicknameError] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)
  const savedNickname = user?.unsafeMetadata.xiaoanNickname
  const nickname = typeof savedNickname === 'string' ? savedNickname.trim().slice(0, MAX_NICKNAME_LENGTH) : ''
  const displayName = nickname || user?.firstName

  async function saveNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || nicknameDraft === null || savingNickname) { return }
    setSavingNickname(true)
    setNicknameError('')
    try {
      const response = await fetch('/api/account/nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nicknameDraft.trim() }),
      })
      if (!response.ok) { throw new Error() }
      await user.reload()
      setNicknameDraft(null)
    }
    catch {
      setNicknameError('昵称保存失败，请重试。')
    }
    finally {
      setSavingNickname(false)
    }
  }

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
  return <details ref={menu} className="chat-account-menu" onToggle={event => { if (event.currentTarget.open) { onMenuOpen?.() } }} onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.currentTarget.open) {
      event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false
      event.currentTarget.querySelector('summary')?.focus()
    }
  }}>
    <summary aria-label={isSignedIn ? '账号菜单' : '账号菜单：登录或注册'}>
      {isSignedIn && user?.imageUrl
        ? <img src={user.imageUrl} alt="" width={32} height={32} />
        : <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>}
      <span>{isSignedIn ? '账号' : '登录'}</span>
    </summary>
    <div className="chat-account-popover">
      <p className="break-all">{!isLoaded ? '正在加载账号…' : isSignedIn ? `已登录${displayName ? `：${displayName}` : ''}` : '正在以游客身份聊天'}</p>
      {isLoaded && !isSignedIn && <button type="button" onClick={() => {
        if (menu.current) { menu.current.open = false }
        onRegister()
      }}>注册 / 登录</button>}
      <button type="button" disabled={!isLoaded} onClick={() => { if (menu.current) { menu.current.open = false }; onOpenPrivacy() }}>隐私与保存</button>
      {isSignedIn && <>
        {nicknameDraft === null
          ? <button type='button' onClick={() => setNicknameDraft(nickname)} className='min-h-11 w-full rounded-lg px-3 text-left hover:bg-[#FFF1E5]'>{nickname ? '编辑昵称' : '设置昵称'}</button>
          : <form onSubmit={saveNickname} className='space-y-2 px-3 py-2'>
            <label htmlFor={nicknameId} className='block font-medium'>昵称（选填）</label>
            <input
              id={nicknameId}
              autoComplete='nickname'
              maxLength={MAX_NICKNAME_LENGTH}
              value={nicknameDraft}
              disabled={savingNickname}
              aria-describedby={nicknameError ? `${nicknameId}-error` : undefined}
              onChange={event => setNicknameDraft(event.target.value)}
              className='min-h-11 w-full rounded-lg border border-[#95684D] px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#95684D]'
            />
            {nicknameError && <p id={`${nicknameId}-error`} role='alert' className='text-red-700'>{nicknameError}</p>}
            <div className='flex gap-2'>
              <button type='submit' disabled={savingNickname} className='min-h-11 rounded-lg bg-[#80583F] px-3 font-medium text-white disabled:opacity-60'>{savingNickname ? '正在保存…' : '保存'}</button>
              <button type='button' disabled={savingNickname} onClick={() => {
                setNicknameDraft(null)
                setNicknameError('')
              }} className='min-h-11 rounded-lg px-3 hover:bg-[#FFF1E5]'>取消</button>
            </div>
          </form>}

        <button type="button" onClick={() => { if (menu.current) { menu.current.open = false }; onOpenMemory() }}>记忆管理</button>
        <button type="button" disabled={busy} onClick={() => void claim()}>将本设备旧游客记录关联到账号</button>
        {user?.publicMetadata.role === 'admin' && isFeedbackAdminEmail(user.primaryEmailAddress?.emailAddress, user.primaryEmailAddress?.verification?.status === 'verified') && <Link href="/feedback">反馈管理</Link>}
        <button type="button" onClick={quickEscape}>退出并清除此设备登录</button>
      </>}
      {status && <p role="status">{status}</p>}
    </div>
  </details>
}
