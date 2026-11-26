'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChatApiError } from '@/service'
import { changeConsent, changeConversationPolicy, expiryText, fetchConversationPolicy, fetchPrivacyOptions, fetchPrivacyStatus, retentionNotice } from '@/service/privacy'
import type { ConversationPolicy, PrivacyField, PrivacyOptions, PrivacyStatus } from '@/types/privacy'
import PrivacyDialog from './privacy-dialog'
import RetentionForm from './retention-form'
import ConsentForm from './consent-form'
import AccountSection from './sections/account-section'
import AnalysisSection from './sections/analysis-section'
import DataSection from './sections/data-section'
import ProfileSection from './sections/profile-section'
import { buttonClass } from './privacy-form-styles'

function message(error: unknown) { return error instanceof ChatApiError ? error.message : '设置暂时不可用，你仍可继续聊天' }

export default function PrivacyControls({ conversationId, signedIn, authReady, busy, completedId, refreshConversation, open, onOpenChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  signedIn: boolean
  authReady: boolean
  busy: boolean
  completedId?: string
  refreshConversation: () => Promise<void>
}) {
  const [options, setOptions] = useState<PrivacyOptions | null>(null)
  const [status, setStatus] = useState<PrivacyStatus | null>(null)
  const [snapshot, setSnapshot] = useState<{ id: string, policy: ConversationPolicy } | null>(null)
  const setOpen = onOpenChange
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [pending, setPending] = useState(false)
  const mutation = useRef<AbortController | null>(null)
  const policy = snapshot?.id === conversationId ? snapshot.policy : null

  useEffect(() => {
    if (!authReady) { return }
    const abort = new AbortController()
    fetchPrivacyOptions(abort.signal).then((value) => { if (!abort.signal.aborted) { setOptions(value) } }).catch((error) => { if (!abort.signal.aborted) { setLoadError(message(error)) } })
    if (signedIn) {
      fetchPrivacyStatus(abort.signal).then((value) => { if (!abort.signal.aborted) { setStatus(value) } }).catch((error) => { if (!abort.signal.aborted) { setLoadError(message(error)) } })
    }
    return () => abort.abort()
  }, [authReady, signedIn, reload])
  useEffect(() => {
    if (!authReady || conversationId === '-1' || busy) { return }
    const abort = new AbortController()
    fetchConversationPolicy(conversationId, abort.signal).then((value) => {
      if (!abort.signal.aborted) { setSnapshot({ id: conversationId, policy: value }) }
    }).catch((error) => { if (!abort.signal.aborted) { setLoadError(message(error)) } })
    return () => abort.abort()
  }, [authReady, conversationId, completedId, busy, reload])
  useEffect(() => () => mutation.current?.abort(), [conversationId, signedIn])

  async function mutate(action: (signal: AbortSignal) => Promise<void>) {
    if (saving || busy || mutation.current) { return }
    const abort = new AbortController()
    mutation.current = abort
    setSaving(true)
    setNotice('')
    try {
      await action(abort.signal)
      if (!abort.signal.aborted) { setNotice(pending ? '本次设置已保存；此前请求的恢复保护同步仍待确认。' : '设置已保存。') }
    }
    catch (error) {
      if (!abort.signal.aborted) {
        if (error instanceof ChatApiError && error.status === 202) { setPending(true) }
        setNotice(message(error))
        setReload(value => value + 1)
      }
    }
    finally { mutation.current = null; setSaving(false) }
  }
  function refresh() {
    setLoadError('')
    setReload(value => value + 1)
    // GET returns local policy only; it cannot attest independent-ledger completion.
    if (pending) { setNotice('已请求刷新本地设置；恢复保护同步仍待确认。') }
  }
  const fineprint = conversationId === '-1' && options
    ? `新对话默认每轮保留${options.default_retention_days}天，可在「隐私与保存」中修改。`
    : retentionNotice(policy)
  return <div className='mt-2 text-center text-xs leading-5 text-[#65594F]'>
    {pending && <p role='status'>恢复保护记录仍在同步，尚未确认完成。</p>}
    {open && <PrivacyDialog onClose={() => setOpen(false)} saving={saving}>
      <p className='mb-2 text-sm leading-6'>尽量不要输入真实姓名、身份证号、电话或详细住址等个人敏感信息。</p>
      <p className='mb-2 text-sm leading-6' aria-live='polite'>{fineprint}</p>
      {!signedIn && <p className='mb-2 text-sm leading-6'>游客对话最长保留到访问凭证到期。</p>}
      {policy?.expires_at != null && <p className='mb-2 text-sm'>{policy.mode === 'ephemeral' ? '临时上下文到期：' : '当前已保存内容最晚到期：'}{expiryText(policy.expires_at)}</p>}
      <p className='text-sm leading-6'>可以直接聊天，也可以选择保存期限。个人信息仅用于在对话中提供适合你的回答；拒绝保存不影响基本聊天。</p>
      {(loadError || notice) && <p role='status' className='my-3 rounded-lg bg-[#FFF1E5] p-3 text-sm'>{notice || loadError}</p>}
      <button type='button' onClick={refresh} disabled={saving} className={`${buttonClass} mt-3`}>刷新状态</button>
      {policy && options
        ? <RetentionForm key={`${conversationId}-${policy.policy_version}`} policy={policy} maxDays={options.max_retention_days} disabled={saving || busy}
          onSave={(mode, days, saveExisting, deleteExisting, extendExisting) => mutate(async (signal) => {
            try {
              const value = await changeConversationPolicy(conversationId, { policy_version: policy.policy_version, mode, retention_days: days, save_existing: saveExisting, delete_existing: deleteExisting, extend_existing: extendExisting }, signal)
              if (!signal.aborted) { setSnapshot({ id: conversationId, policy: value }); await refreshConversation() }
            }
            catch (error) {
              // Local deletion may already be committed while ledger synchronization is pending.
              if (!signal.aborted && error instanceof ChatApiError && error.status === 202) { await refreshConversation() }
              throw error
            }
          })} />
        : <p className='mt-4 text-sm'>正在确认本次对话的保存策略；暂时无法修改时仍可继续聊天。</p>}
      <section className='mt-6 border-t border-[#E6DDD5] pt-4' aria-labelledby='personal-fields-title'>
        <h3 id='personal-fields-title' className='font-semibold'>允许保存哪些个人信息</h3>
        <p className='mt-2 text-sm leading-6'>各项默认不授权，分别设置期限。地区由你主动选择，系统不会通过浏览器或 IP 识别。称呼可用昵称，无需真实姓名。</p>
        {!signedIn
          ? <p className='mt-3 text-sm'><Link href='/sign-in' className='underline'>登录</Link>后可管理这些授权；现在可以继续聊天。</p>
          : status && options
            ? status.available
              ? <div className='mt-3 space-y-4'>
                {(['region', 'nickname', 'preferences'] as PrivacyField[]).filter(field => options.fields.includes(field)).map(field => <ConsentForm
                  key={`${field}-${status.fields[field].version}`}
                  field={field}
                  status={status.fields[field]}
                  options={options}
                  disabled={saving || busy}
                  onSave={body => mutate(async (signal) => { const value = await changeConsent(field, body, signal); if (!signal.aborted) { setStatus(value) } })}
                />)}
              </div>
              : <p className='mt-3 text-sm'>个人信息保存服务暂时不可用，你仍可继续聊天。</p>
            : <p className='mt-3 text-sm'>授权状态正在确认，尚未修改任何授权。</p>}
      </section>
      <DataSection key={String(signedIn)} reload={reload} disabled={saving || busy} mutate={mutate} />
      <AnalysisSection signedIn={signedIn} disabled={saving || busy} reload={reload} mutate={mutate} />
      <ProfileSection signedIn={signedIn} disabled={saving || busy} temporary={policy?.mode === 'ephemeral'} reload={reload} mutate={mutate} />
      <AccountSection signedIn={signedIn} disabled={saving || busy} />
    </PrivacyDialog>}
  </div>
}
