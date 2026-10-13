'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChatApiError } from '@/service'
import { changeConsent, changeConversationPolicy, expiryText, fetchConversationPolicy, fetchPrivacyOptions, fetchPrivacyStatus, retentionNotice } from '@/service/privacy'
import type { ConsentChange, ConsentStatus, ConversationPolicy, PrivacyField, PrivacyOptions, PrivacyStatus, RetentionMode } from '@/types/privacy'
import { quickEscape } from '@/app/components/quick-exit'

const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-[#D5C9BF] bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#95684D]'
const buttonClass = 'min-h-11 rounded-lg border border-[#95684D] px-3 text-sm hover:bg-[#FFF1E5] disabled:cursor-not-allowed disabled:opacity-50'
const fieldNames: Record<PrivacyField, string> = { region: '省市地区', nickname: '称呼', preferences: '回答偏好' }
function message(error: unknown) { return error instanceof ChatApiError ? error.message : '设置暂时不可用，你仍可继续聊天' }

export default function PrivacyControls({ conversationId, signedIn, authReady, busy, completedId, prepareConversation, refreshConversation }: {
  conversationId: string
  signedIn: boolean
  authReady: boolean
  busy: boolean
  completedId?: string
  prepareConversation: () => Promise<string | null>
  refreshConversation: () => Promise<void>
}) {
  const [options, setOptions] = useState<PrivacyOptions | null>(null)
  const [status, setStatus] = useState<PrivacyStatus | null>(null)
  const [snapshot, setSnapshot] = useState<{ id: string, policy: ConversationPolicy } | null>(null)
  const [open, setOpen] = useState(false)
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

  async function showSettings() {
    if (busy) { return }
    if (conversationId === '-1' && !await prepareConversation()) { return }
    setNotice('')
    refresh()
    setOpen(true)
  }
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
    <p>尽量不要输入真实姓名、身份证号、电话或详细住址等个人敏感信息。</p>
    <p aria-live='polite'>{fineprint}</p>
    {policy?.expires_at != null && <p>{policy.mode === 'ephemeral' ? '临时上下文到期：' : '当前已保存内容最晚到期：'}{expiryText(policy.expires_at)}</p>}
    <button type='button' onClick={() => void showSettings()} disabled={busy || !authReady} className='min-h-11 px-3 underline underline-offset-4 disabled:opacity-50'>隐私与保存</button>
    {pending && <p role='status'>恢复保护记录仍在同步，尚未确认完成。</p>}
    {open && <PrivacyDialog onClose={() => setOpen(false)} saving={saving}>
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
    </PrivacyDialog>}
  </div>
}

function PrivacyDialog({ children, onClose, saving }: { children: React.ReactNode, onClose: () => void, saving: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  return <dialog ref={dialog} aria-labelledby='privacy-title' onCancel={(event) => { event.preventDefault(); if (!saving) { onClose() } }} className='max-h-[90dvh] w-[min(94vw,640px)] overflow-y-auto rounded-2xl bg-[#FBF9F6] p-5 text-left text-[#3D3028] shadow-xl backdrop:bg-black/30 sm:p-6'>
    <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
      <h2 id='privacy-title' className='text-lg font-semibold'>隐私与保存</h2>
      <div className='flex gap-2'>
        <button type='button' onClick={quickEscape} className={buttonClass}>快速离开</button>
        <button type='button' onClick={onClose} disabled={saving} className={buttonClass}>关闭</button>
      </div>
    </div>
    {children}
  </dialog>
}

function RetentionForm({ policy, maxDays, disabled, onSave }: { policy: ConversationPolicy, maxDays: number, disabled: boolean, onSave: (mode: RetentionMode, days: number, saveExisting: boolean, deleteExisting: boolean, extendExisting: boolean) => Promise<void> }) {
  const [mode, setMode] = useState(policy.mode)
  const [days, setDays] = useState(String(policy.retention_days ?? 30))
  const [saveExisting, setSaveExisting] = useState(false)
  const [deleteExisting, setDeleteExisting] = useState(false)
  const [extendExisting, setExtendExisting] = useState(false)
  return <form className='mt-4' onSubmit={(event) => { event.preventDefault(); void onSave(mode, Number(days), saveExisting, deleteExisting, extendExisting) }}>
    <fieldset disabled={disabled} className='space-y-3'>
      <legend className='mb-2 font-semibold'>本次对话的保存期限</legend>
      <label className='block text-sm'>保存方式
        <select className={inputClass} value={mode} onChange={(event) => {
          const next = event.target.value as RetentionMode
          setMode(next); setDays(String(next === 'rolling' ? 14 : 30)); setSaveExisting(false); setDeleteExisting(false); setExtendExisting(false)
        }}>
          <option value='history'>逐轮保存</option><option value='rolling'>整段会话一起保留</option><option value='ephemeral'>不保存新的聊天历史</option>
        </select>
      </label>
      {mode !== 'ephemeral'
        ? <>
          <label className='block text-sm'>保留天数（1–{maxDays}天）<input type='number' required min={1} max={maxDays} step={1} value={days} onChange={event => setDays(event.target.value)} className={inputClass} /></label>
          <p className='text-sm leading-6'>{mode === 'rolling' ? '整段会话从最后一轮成功回答起计算；新回复成功完成后重新起算。' : '每轮从成功完成回答起分别计算保存时间。'}</p>
          {policy.mode === 'ephemeral' && <label className='flex items-start gap-2 text-sm leading-6'><input type='checkbox' checked={saveExisting} onChange={event => setSaveExisting(event.target.checked)} className='mt-1' />同时保存当前仍有效的临时对话内容</label>}
          <label className='flex items-start gap-2 text-sm leading-6'><input type='checkbox' checked={extendExisting} onChange={event => setExtendExisting(event.target.checked)} className='mt-1' />将尚未到期的已有历史从现在起延长至所选天数</label>
          <p className='text-xs leading-5'>增加天数默认仅影响后续保存，不自动延长已有历史；缩短期限会同时缩短已有记录，到期内容不会恢复。</p>
        </>
        : <>
          <p className='text-sm leading-6'>新回复只保留临时上下文，闲置24小时后清除；服务重启可能丢失。已有历史仍按原期限到期。</p>
          <label className='flex items-start gap-2 text-sm leading-6'><input type='checkbox' checked={deleteExisting} onChange={event => setDeleteExisting(event.target.checked)} className='mt-1' />同时删除已有历史与临时上下文（删除后无法恢复）</label>
        </>}
      <button type='submit' className={buttonClass}>保存会话设置</button>
    </fieldset>
  </form>
}

function ConsentForm({ field, status, options, disabled, onSave }: { field: PrivacyField, status: ConsentStatus, options: PrivacyOptions, disabled: boolean, onSave: (change: ConsentChange) => Promise<void> }) {
  const [allowed, setAllowed] = useState(status.allowed)
  const [days, setDays] = useState(String(options.default_retention_days))
  const [nickname, setNickname] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [purpose, setPurpose] = useState<'event' | 'help'>('event')
  const [detail, setDetail] = useState('default')
  const [presentation, setPresentation] = useState('default')
  const body = (allowed: boolean, extend = false): ConsentChange => ({ version: status.version, allowed, retention_days: Number(days), extend })
  return <form className='rounded-xl border border-[#E6DDD5] p-3' onSubmit={(event) => {
    event.preventDefault()
    const change = body(allowed)
    if (allowed) { change.value = field === 'nickname'
      ? nickname.trim()
      : field === 'region'
        ? { province_code: province, ...(city ? { city_code: city } : {}), purpose }
        : { detail, presentation } }
    void onSave(change)
  }}>
    <fieldset disabled={disabled} className='space-y-3'>
      <legend className='font-semibold'>{fieldNames[field]}</legend>
      <p className='text-xs leading-5'>{status.allowed ? `已授权，到期：${expiryText(status.expires_at)}` : '未授权或已到期'}</p>
      <label className='flex min-h-11 items-center gap-2 text-sm'><input type='checkbox' checked={allowed} onChange={event => setAllowed(event.target.checked)} />允许保存{fieldNames[field]}</label>
      {allowed && <>
        {field === 'nickname' && <label className='block text-sm'>昵称（无需真实姓名）<input required value={nickname} maxLength={40} pattern={'[^\\[\\]@0-9\\r\\n]+'} onChange={event => setNickname(event.target.value)} autoComplete='off' className={inputClass} /></label>}
        {field === 'region' && <>
          <label className='block text-sm'>省级地区<select required value={province} onChange={(event) => { setProvince(event.target.value); setCity('') }} className={inputClass}>
            <option value=''>请主动选择</option>{Object.entries(options.provinces).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select></label>
          <label className='block text-sm'>城市（可选，行政区划代码）<select value={city} onChange={event => setCity(event.target.value)} disabled={!province || disabled} className={inputClass}>
            <option value=''>仅使用省级地区</option>{options.city_codes.filter(code => code.slice(0, 2) === province.slice(0, 2)).map(code => <option key={code} value={code}>{code}</option>)}
          </select></label>
          <label className='block text-sm'>此地区用于<select value={purpose} onChange={event => setPurpose(event.target.value as 'event' | 'help')} className={inputClass}>
            <option value='event'>事件发生地法规匹配</option><option value='help'>希望求助地法规匹配</option>
          </select></label>
        </>}
        {field === 'preferences' && <>
          <label className='block text-sm'>详细程度<select value={detail} onChange={event => setDetail(event.target.value)} className={inputClass}>
            <option value='default'>默认</option><option value='brief'>简短</option><option value='detailed'>详细</option>
          </select></label>
          <label className='block text-sm'>表达方式<select value={presentation} onChange={event => setPresentation(event.target.value)} className={inputClass}>
            <option value='default'>默认</option><option value='paragraphs'>以段落为主</option><option value='few_steps'>少列步骤</option>
          </select></label>
        </>}
      </>}
      <label className='block text-sm'>保存或展期天数（1–{options.max_retention_days}天）<input type='number' required min={1} max={options.max_retention_days} step={1} value={days} onChange={event => setDays(event.target.value)} className={inputClass} /></label>
      {status.allowed && <p className='text-xs leading-5'>已保存的原值不回填到表单。更新内容沿用原到期时间；展期从现在起计算，并沿用已授权内容。</p>}
      <div className='flex flex-wrap gap-2'>
        <button type='submit' className={buttonClass}>{allowed ? status.allowed ? '更新内容' : '确认授权并保存' : '确认不保存 / 撤回'}</button>
        {status.allowed && <>
          <button type='button' className={buttonClass} onClick={(event) => {
            // Validate the period without requiring a replacement nickname or region.
            const period = event.currentTarget.form?.querySelector<HTMLInputElement>('input[type="number"]')
            if (period?.reportValidity()) { void onSave(body(true, true)) }
          }}>沿用内容并展期</button>
          <button type='button' className={buttonClass} onClick={() => void onSave({ ...body(false), retention_days: options.default_retention_days })}>撤回授权</button>
        </>}
      </div>
    </fieldset>
  </form>
}
