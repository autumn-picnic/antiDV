import { useState } from 'react'
import type { ConversationPolicy, RetentionMode } from '@/types/privacy'
import { buttonClass, inputClass } from './privacy-form-styles'

export default function RetentionForm({ policy, maxDays, disabled, onSave }: { policy: ConversationPolicy, maxDays: number, disabled: boolean, onSave: (mode: RetentionMode, days: number, saveExisting: boolean, deleteExisting: boolean, extendExisting: boolean) => Promise<void> }) {
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
