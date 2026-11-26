import { useEffect, useState } from 'react'
import { changeProfile, fetchProfile, type Profile, type ProfileAction } from '@/service/profile'
import { buttonClass, inputClass } from '../privacy-form-styles'

export default function ProfileSection({ signedIn, disabled, temporary, reload, mutate }: {
  signedIn: boolean, disabled: boolean, temporary: boolean, reload: number,
  mutate: (action: (signal: AbortSignal) => Promise<void>) => Promise<void>
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState(false)
  const [rename, setRename] = useState<{ itemId: string, alias: string, value: string } | null>(null)
  const [confirm, setConfirm] = useState<{ action: ProfileAction, message: string } | null>(null)
  useEffect(() => {
    if (!signedIn) { return }
    const controller = new AbortController()
    setProfile(null)
    setError(false)
    setConfirm(null)
    setRename(null)
    void fetchProfile(controller.signal).then(value => {
      if (!controller.signal.aborted) { setProfile(value) }
    }).catch(() => {
      if (!controller.signal.aborted) { setError(true) }
    })
    return () => controller.abort()
  }, [signedIn, reload])

  function run(action: ProfileAction) {
    if (!profile) { return }
    void mutate(async (signal) => {
      const result = await changeProfile(signal, profile.version, action)
      if (signal.aborted) { return }
      if (action.action === 'export') {
        const url = URL.createObjectURL(new Blob([JSON.stringify(result.export, null, 2)], { type: 'application/json' }))
        const link = document.createElement('a')
        link.href = url
        link.download = '小安跨对话记忆.json'
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 0)
      }
      else {
        setProfile(null)
        const latest = await fetchProfile(signal)
        if (!signal.aborted) { setProfile(latest); setConfirm(null); setRename(null) }
      }
    })
  }

  const items = profile ? [...profile.people, ...profile.notes, ...profile.boundaries, ...profile.outcomes] : []
  return <section className='mt-6 space-y-3 border-t border-[#E6DDD5] pt-4' aria-labelledby='profile-memory-title'>
    <h3 id='profile-memory-title' className='font-semibold'>跨对话记忆</h3>
    {!signedIn ? <p className='text-sm'>登录后可管理跨对话记忆。</p>
      : error ? <p role='alert' className='text-sm'>暂时无法读取跨对话记忆。请刷新状态。</p>
        : !profile ? <p role='status' className='text-sm'>正在读取跨对话记忆…</p>
          : <>
            <p className='text-sm'>小安可以使用跨对话记忆接续之前谈过的情况。关闭时会清除已整理的内容。当前对话的整理结果可以在「记忆管理」查看。</p>
            {temporary && <p className='text-sm'>当前为临时对话，跨对话记忆暂停使用和更新。</p>}
            <p className='text-sm'>{profile.exists ? (profile.enabled ? '保存跨对话记忆已开启。' : '保存跨对话记忆已关闭。') : '尚未建立跨对话记忆。首次使用时默认开启，你也可以现在关闭。'}</p>
            {confirm ? <div className='space-y-2'>
              <p className='text-sm'>{confirm.message}</p>
              <div className='flex flex-wrap gap-2'>
                <button type='button' className={buttonClass} disabled={disabled} autoFocus onClick={() => setConfirm(null)}>取消</button>
                <button type='button' className={buttonClass} disabled={disabled} onClick={() => run(confirm.action)}>确认</button>
              </div>
            </div> : <div className='flex flex-wrap gap-2'>
              <button type='button' className={buttonClass} disabled={disabled} onClick={() => {
                const enabled = profile.exists && !profile.enabled
                if (enabled) { run({ action: 'set_enabled', enabled }) }
                else { setConfirm({ action: { action: 'set_enabled', enabled }, message: '关闭并清除全部跨对话记忆？' }) }
              }}>{profile.exists && !profile.enabled ? '开启保存' : '关闭保存'}</button>
              <button type='button' className={buttonClass} disabled={disabled || !items.length} onClick={() => setConfirm({ action: { action: 'clear' }, message: '清除已整理的跨对话记忆？清除后会按当前设置继续整理。' })}>清除内容</button>
              <button type='button' className={buttonClass} disabled={disabled || !profile.exists} onClick={() => run({ action: 'export' })}>导出</button>
            </div>}
            <details className='space-y-2 text-sm'>
              <summary className='cursor-pointer'>查看已整理的内容</summary>
              {!items.length && <p>暂无已整理的内容。</p>}
              {items.map(item => <div key={item.id} className='space-y-2 rounded-lg border border-[#E6DDD5] p-3'>
                <p className='break-words'>{item.text || item.label || [item.target, item.stance].filter(Boolean).join(' · ')}</p>
                {item.names?.map(alias => <div key={alias} className='space-y-2'>
                  <p className='break-words'>{alias}{item.confirmed_names?.includes(alias) ? '（已确认）' : ''}</p>
                  {rename?.itemId === item.id && rename.alias === alias ? <form onSubmit={event => {
                    event.preventDefault()
                    if (disabled || !rename.value.trim() || rename.value.trim() === alias) { return }
                    run({ action: 'rename_alias', item_id: item.id, alias_value: alias, new_value: rename.value.trim() })
                  }}>
                    <label className='block'>新的别名
                      <input className={inputClass} maxLength={64} autoFocus value={rename.value} onChange={event => setRename({ ...rename, value: event.target.value })} />
                    </label>
                    <div className='mt-2 flex gap-2'>
                      <button type='button' className={buttonClass} disabled={disabled} onClick={() => setRename(null)}>取消</button>
                      <button type='submit' className={buttonClass} disabled={disabled || !rename.value.trim() || rename.value.trim() === alias}>保存别名</button>
                    </div>
                  </form> : <div className='flex flex-wrap gap-2'>
                    {!item.confirmed_names?.includes(alias) && <button type='button' className={buttonClass} disabled={disabled || !!confirm || !!rename} onClick={() => run({ action: 'confirm_alias', item_id: item.id, alias_value: alias })}>确认别名</button>}
                    <button type='button' className={buttonClass} disabled={disabled || !!confirm || !!rename} onClick={() => setRename({ itemId: item.id, alias, value: alias })}>修改别名</button>
                    <button type='button' className={buttonClass} disabled={disabled || !!confirm || !!rename} onClick={() => setConfirm({ action: { action: 'delete_alias', item_id: item.id, alias_value: alias }, message: '删除这个别名？' })}>删除别名</button>
                  </div>}
                </div>)}
                <button type='button' className={buttonClass} disabled={disabled || !!confirm} onClick={() => setConfirm({ action: { action: 'delete_item', item_id: item.id }, message: '删除这一条跨对话记忆？' })}>删除此条</button>
              </div>)}
            </details>
          </>}
  </section>
}
