import { useState } from 'react'
import { expiryText } from '@/service/privacy'
import type { ConsentChange, ConsentStatus, PrivacyField, PrivacyOptions } from '@/types/privacy'
import { buttonClass, inputClass } from './privacy-form-styles'

const fieldNames: Record<PrivacyField, string> = { region: '省市地区', nickname: '称呼', preferences: '回答偏好' }

export default function ConsentForm({ field, status, options, disabled, onSave }: { field: PrivacyField, status: ConsentStatus, options: PrivacyOptions, disabled: boolean, onSave: (change: ConsentChange) => Promise<void> }) {
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
