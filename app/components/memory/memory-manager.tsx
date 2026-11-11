'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowPathIcon, PlusIcon, XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import MemoryAddForm from './memory-add-form'
import './memory-manager.css'

interface Person { id: string, label: string }
interface Alias { id: string, person_id: string, label: string, status: string }
interface Mention { id: string, person_id: string | null, status: string }
interface Relationship { id: string, person_id: string, related_person_id: string | null, kind: string, mode: string, status: string }
interface Memory { revision: number, people: Person[], aliases: Alias[], mentions: Mention[], relationships: Relationship[] }
type Action = 'delete_person' | 'delete_alias' | 'delete_relation' | 'retract_relation' | 'end_relation' | 'relink_mention'
interface Change { action: Action, record_id: string, person_id?: string, label: string }
const kinds: Record<string, string> = { friend: '朋友', colleague: '同事', partner: '伴侣', spouse: '配偶', parent: '父母', child: '子女', sibling: '兄弟姐妹', ex_partner: '前伴侣', family: '家人' }
const statuses: Record<string, string> = { active: '当前', ended: '已结束', retracted: '已撤回', pending: '待确认', unresolved: '待确认', asserted: '已确认', evidence: '待确认' }

export default function MemoryManager({ conversationId, conversationName, disabled, onClose, onSend }: {
  conversationId: string, conversationName: string, disabled: boolean, onClose: () => void, onSend: (text: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const actionPanel = useRef<HTMLDivElement>(null)
  const request = useRef<AbortController | null>(null)
  const [memory, setMemory] = useState<Memory | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const [search, setSearch] = useState('')
  const [change, setChange] = useState<Change | null>(null)
  const [addition, setAddition] = useState<{ kind: 'person' | 'relation', personId?: string } | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const endpoint = `/v1/conversations/${encodeURIComponent(conversationId)}/memory`

  async function load() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError(''); setMemory(null); setUnavailable(false)
    if (conversationId === '-1') { setLoading(false); return }
    try {
      const response = await fetch(endpoint, { signal: controller.signal, cache: 'no-store', credentials: 'include' })
      if (response.status === 404) { setUnavailable(true); return }
      if (!response.ok) { throw new Error('暂时无法读取记忆，请重试。') }
      const data: Memory = await response.json()
      if (!controller.signal.aborted) { setMemory(data) }
    }
    catch (err) { if (!controller.signal.aborted) { setError(err instanceof Error ? err.message : '读取失败，请重试。') } }
    finally { if (!controller.signal.aborted) { setLoading(false) } }
  }
  useEffect(() => {
    const element = dialog.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element?.showModal()
    void load()
    return () => { request.current?.abort(); element?.close(); document.body.style.overflow = overflow }
    // The parent keys this dialog by conversation and identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editing = draft !== null || addition !== null
  useEffect(() => {
    if (change || editing) { actionPanel.current?.scrollIntoView({ block: 'nearest' }) }
  }, [change, editing, addition])

  async function apply() {
    if (!change || !memory || saving || disabled) { return }
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch(`${endpoint}/actions`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: memory.revision, action: change.action, record_id: change.record_id, ...(change.person_id ? { person_id: change.person_id } : {}) }),
        signal: request.current?.signal,
      })
      if (response.status === 409) {
        setChange(null); await load(); setError('对话中的记忆刚有更新，已重新读取，请检查后再操作。'); return
      }
      if (response.status === 202) {
        setChange(null); setMemory(null); setUnavailable(true)
        setNotice('变更正在同步，尚未确认完成。请稍后重新读取核对。'); return
      }
      if (!response.ok) { throw new Error(response.status === 422 ? '这条记录目前无法修改，请重新读取后再试。' : '变更未能确认，请重新读取后检查。') }
      setChange(null); await load(); setNotice('记忆已更新。')
    }
    catch (err) { setError(err instanceof Error ? err.message : '变更未能确认，请重试。') }
    finally { setSaving(false) }
  }
  const label = (id: string | null) => memory?.people.find(p => p.id === id)?.label || (id ? '未命名人物' : '你')
  const people = memory?.people.filter(p => `${p.label} ${memory.aliases.filter(a => a.person_id === p.id).map(a => a.label).join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) || []
  const locked = saving || disabled
  const canAdd = !locked && !loading && !unavailable && (conversationId === '-1' || Boolean(memory))
  function openAddition(kind: 'person' | 'relation', personId?: string) {
    setDraft(null); setChange(null); setAddition({ kind, personId })
  }
  return <dialog ref={dialog} className='memory-dialog' aria-labelledby='memory-title' aria-describedby='memory-description' onCancel={event => { event.preventDefault(); if (!saving) { onClose() } }}>
    <header className='memory-heading'>
      <div className='memory-heading-icon'><UserGroupIcon width={24} aria-hidden='true' /></div>
      <div className='min-w-0 flex-1'><p className='memory-eyebrow'>由你决定，小安记住什么</p><h2 id='memory-title'>记忆管理</h2></div>
      <button type='button' className='memory-icon-button' aria-label='关闭记忆管理' disabled={saving} onClick={onClose}><XMarkIcon width={22} /></button>
    </header>
    <div className='memory-content' aria-busy={loading || saving}>
      <div className='memory-scope'><span className='memory-dot' />仅限当前对话<span className='memory-conversation'>{conversationName}</span></div>
      <p id='memory-description' className='memory-description'>查看小安整理的人物与关系。你可以纠正理解、减少记录，也可以补充新的信息。</p>
      <div className='memory-toolbar'><label className='flex-1'><span className='sr-only'>搜索人物或称呼</span><input type='search' placeholder='搜索人物或称呼' value={search} onChange={e => setSearch(e.target.value)} disabled={!memory || loading} /></label><button type='button' className='memory-primary' disabled={locked || loading || unavailable || (conversationId !== '-1' && !memory)} onClick={() => { setAddition(null); setDraft(''); setChange(null) }}><PlusIcon width={18} aria-hidden='true' />补充信息</button><button type='button' className='memory-icon-button' aria-label='重新读取记忆' disabled={loading || locked} onClick={() => { setChange(null); setNotice(''); void load() }}><ArrowPathIcon width={19} /></button></div>
      <div className='memory-add-actions'><button type='button' disabled={!canAdd} onClick={() => openAddition('person')}><PlusIcon width={18} aria-hidden='true' />新增人物</button><button type='button' disabled={!canAdd || !memory?.people.length} onClick={() => openAddition('relation')}><PlusIcon width={18} aria-hidden='true' />新增关系</button></div>
      {disabled && <p className='memory-message'>请等待当前对话处理完成，再调整记忆。</p>}
      {error && <p role='alert' className='memory-error'>{error}</p>}
      {notice && <p role='status' className='memory-message'>{notice}</p>}
      {loading ? <p role='status' className='memory-empty'>正在读取当前对话的记忆…</p> : unavailable ? <div className='memory-empty'><UserGroupIcon width={32} aria-hidden='true' /><h3>暂时无法使用记忆管理</h3><p>功能可能尚未启用，或当前对话已不可访问。请稍后重新读取。</p></div> : !memory && error ? null : !people.length ? <div className='memory-empty'><UserGroupIcon width={32} aria-hidden='true' /><h3>{search ? '没有找到对应的人物' : '这里还没有人物记忆'}</h3><p>{search ? '试试其他名字或称呼。' : '你可以补充信息，或继续聊天，让小安逐步了解。'}</p></div> : <>
        <p className='memory-count'>{people.length} 位人物<span>人物可以同时拥有多种关系</span></p>
        {people.map(person => <article key={person.id} className='memory-card'>
          <div className='memory-card-heading'><div className='memory-person-icon' aria-hidden='true'>{person.label.slice(0, 1)}</div><h3>{person.label}</h3><button type='button' disabled={locked} onClick={() => { setAddition(null); setDraft(`关于${person.label}，我想更正：`); setChange(null) }}>修正信息</button><button type='button' className='memory-danger' disabled={locked} onClick={() => { setAddition(null); setChange({ action: 'delete_person', record_id: person.id, label: `删除「${person.label}」的人物记忆及相关称呼、关系和提及` }); setDraft(null) }}>删除</button></div>
          <div className='memory-aliases'><span>称呼</span>{memory?.aliases.filter(a => a.person_id === person.id && a.status === 'active').map(alias => <span key={alias.id} className='memory-chip'>{alias.label}<button type='button' disabled={locked} aria-label={`删除称呼${alias.label}`} onClick={() => { setAddition(null); setChange({ action: 'delete_alias', record_id: alias.id, label: `删除称呼「${alias.label}」` }); setDraft(null) }}><XMarkIcon width={14} /></button></span>)}</div>
          {memory?.relationships.filter(r => r.person_id === person.id && r.status !== 'deleted').map(relation => <div key={relation.id} className='memory-relation'><div><strong>与{label(relation.related_person_id)} · {kinds[relation.kind] || relation.kind}</strong><span>{statuses[relation.status] || relation.status}{relation.mode !== 'asserted' ? ' · 待确认信息' : ''}</span></div><label><span className='sr-only'>调整{person.label}的关系</span><select value='' disabled={locked} onChange={e => { if (e.target.value) { setAddition(null); setChange({ action: e.target.value as Action, record_id: relation.id, label: `${e.target.selectedOptions[0].text}：${person.label}与${label(relation.related_person_id)}的${kinds[relation.kind] || relation.kind}关系` }); setDraft(null) } }}><option value=''>调整关系</option>{relation.status === 'active' && <option value='end_relation'>关系已结束</option>}{relation.status !== 'retracted' && <option value='retract_relation'>原记录有误，撤回</option>}<option value='delete_relation'>删除这条关系</option></select></label></div>)}
          <button type='button' className='memory-add-relation' disabled={!canAdd} onClick={() => openAddition('relation', person.id)}>＋ 新增关系</button>
          <details className='memory-mentions'><summary>纠正人物提及的归属</summary><p>选择实际指向的人物。更正后，相关事实会重新等待确认。</p>{memory?.mentions.filter(m => m.person_id === person.id && m.status !== 'deleted').map((mention, index) => <label key={mention.id} className='memory-relation'><span>提及 {index + 1} · {statuses[mention.status] || mention.status}</span><select aria-label={`更正${person.label}的第${index + 1}次提及`} value={mention.person_id || ''} disabled={locked} onChange={e => { setAddition(null); setChange({ action: 'relink_mention', record_id: mention.id, person_id: e.target.value || undefined, label: `将这次提及改为「${e.target.value ? label(e.target.value) : '待确认人物'}」${e.target.value ? '' : '（待确认）'}` }); setDraft(null) }}><option value=''>待确认人物</option>{memory?.people.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>)}</details>
        </article>)}
      </>}
      <div ref={actionPanel}>
      {addition && <MemoryAddForm key={`${addition.kind}:${addition.personId || ''}`} kind={addition.kind} initialPersonId={addition.personId} people={memory?.people || []} disabled={!canAdd} onCancel={() => setAddition(null)} onSend={onSend} />}
      {draft !== null && <form className='memory-editor' onSubmit={e => { e.preventDefault(); if (!locked && draft.trim() && Array.from(draft.trim()).length <= 4000) { onSend(draft.trim()) } }}><h3>补充或修正信息</h3><label htmlFor='memory-draft'>希望小安了解什么？</label><textarea id='memory-draft' autoFocus rows={4} maxLength={4000} value={draft} onChange={e => setDraft(e.target.value)} placeholder='例如：晓岚是我的朋友，也是同事。' disabled={locked} /><p>这段内容会作为新消息发送到当前对话，并生成回复。小安会根据内容整理记忆，你可以在回复后重新打开核对。</p><div className='memory-actions'><button type='button' disabled={saving} onClick={() => setDraft(null)}>取消</button><button type='submit' className='memory-primary' disabled={locked || !draft.trim()}>发送到对话</button></div></form>}
      {change && <section className='memory-confirm' aria-label='确认记忆变更'><h3>确认这次调整？</h3><p>{change.label}</p><p>聊天原文会保留。删除后无法在这里撤销，以后聊天中再次提及仍可能形成新的记忆。</p><div className='memory-actions'><button type='button' disabled={saving} onClick={() => setChange(null)}>取消</button><button type='button' className='memory-primary' disabled={locked} onClick={() => void apply()}>{saving ? '正在更新…' : '确认调整'}</button></div></section>}
      </div>
    </div>
    <footer className='memory-footer'><p>记忆的保存方式沿用当前对话设置；临时模式下的调整仅临时有效。删除记忆会保留聊天原文。</p><button type='button' disabled={saving} onClick={onClose}>完成</button></footer>
  </dialog>
}
