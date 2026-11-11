'use client'
import { useState } from 'react'

interface Person { id: string, label: string }
const relationOptions = ['朋友', '同事', '伴侣', '配偶', '父母', '子女', '兄弟姐妹', '前伴侣', '家人']

export default function MemoryAddForm({ kind, people, initialPersonId, disabled, onCancel, onSend }: {
  kind: 'person' | 'relation', people: Person[], initialPersonId?: string, disabled: boolean,
  onCancel: () => void, onSend: (text: string) => void
}) {
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [subject, setSubject] = useState(initialPersonId || '')
  const [target, setTarget] = useState('self')
  const [relations, setRelations] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [status, setStatus] = useState('current')
  const [note, setNote] = useState('')
  const person = people.find(p => p.id === subject)
  const targetPerson = people.find(p => p.id === target)
  const subjectName = kind === 'person' ? name.trim() : person?.label || ''
  const selectedRelations = [...relations, ...(custom.trim() ? [custom.trim()] : [])]
  const valid = Boolean(subjectName && (kind === 'person' || selectedRelations.length) && (target === 'self' || targetPerson) && (kind === 'person' || subject !== target))
  const subjectText = kind === 'person' ? `我想补充一位人物：${subjectName}。${alias.trim() ? `我也称呼这个人为「${alias.trim()}」。` : ''}` : `我想补充${subjectName}的关系。`
  const relationText = selectedRelations.length ? `「${subjectName}」是「${target === 'self' ? '我自己' : targetPerson?.label || ''}」的${selectedRelations.join('、')}。${status === 'ended' ? '这些关系已经结束。' : status === 'uncertain' ? '这些关系尚不确定，请作为待确认信息。' : '这些关系目前仍然存在。'}` : ''
  const message = `${subjectText}${relationText}${note.trim() ? `补充说明：${note.trim()}` : ''}`
  return <form className='memory-editor memory-add-form' aria-labelledby='memory-add-title' onSubmit={event => { event.preventDefault(); if (valid && !disabled && Array.from(message).length <= 4000) { onSend(message) } }}>
    <h3 id='memory-add-title'>{kind === 'person' ? '新增人物' : '新增关系'}</h3>
    <fieldset disabled={disabled}>
      {kind === 'person' ? <div className='memory-form-grid'>
        <label>姓名或称呼<span aria-hidden='true'> *</span><input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder='例如：晓岚' /></label>
        <label>其他称呼（选填）<input maxLength={100} value={alias} onChange={e => setAlias(e.target.value)} placeholder='例如：小岚' /></label>
      </div> : <label>选择人物<span aria-hidden='true'> *</span><select autoFocus required value={subject} onChange={e => { setSubject(e.target.value); if (e.target.value === target) { setTarget('self') } }}><option value=''>请选择人物</option>{people.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>}
      <label>关系另一方<select value={target} onChange={e => setTarget(e.target.value)}><option value='self'>我自己</option>{people.filter(p => kind === 'person' || p.id !== subject).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <fieldset className='memory-relation-options'><legend>人物关系{kind === 'person' ? '（选填，可多选）' : '（至少选择一项或填写其他关系）'}</legend><div>{relationOptions.map(relation => <label key={relation}><input type='checkbox' checked={relations.includes(relation)} onChange={e => setRelations(current => e.target.checked ? [...current, relation] : current.filter(r => r !== relation))} /><span>{relation}</span></label>)}</div></fieldset>
      <label>其他关系（选填）<input maxLength={100} value={custom} onChange={e => setCustom(e.target.value)} placeholder='例如：邻居、房东' /></label>
      {selectedRelations.length > 0 && <label>关系状态<select value={status} onChange={e => setStatus(e.target.value)}><option value='current'>目前仍然存在</option><option value='ended'>已经结束</option><option value='uncertain'>尚不确定</option></select></label>}
      <label>补充说明（选填）<textarea maxLength={1000} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder='例如：我们是去年在工作中认识的。' /></label>
    </fieldset>
    <div className='memory-submission-preview'><h4>将发送以下消息</h4><p>{subjectName ? message : '填写后，这里会显示要发送的内容。'}</p></div>
    <p>确认后会作为新消息发送到当前对话，并生成回复。小安会根据内容整理记忆，请在回复后重新打开核对。</p>
    <div className='memory-actions'><button type='button' disabled={disabled} onClick={onCancel}>取消</button><button type='submit' className='memory-primary' disabled={disabled || !valid}>确认并发送到对话</button></div>
  </form>
}
