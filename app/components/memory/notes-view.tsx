export interface NotesMemory {
  revision: number
  notes: { id: string, text: string, needs_review: boolean }[]
  boundaries: { id: string, target: string | null, stance: string | null, conditions: string | null }[]
  actions: { id: string, text: string }[]
  notice: string
}

export default function NotesView({ memory, disabled, onReset, onReload }: {
  memory: NotesMemory, disabled: boolean, onReset: () => void, onReload: () => void
}) {
  const sections = [
    { heading: '笔记', items: memory.notes.map(note => ({ id: note.id, text: `${note.text}${note.needs_review ? ' · 待确认' : ''}` })) },
    { heading: '对话边界', items: memory.boundaries.map(boundary => ({ id: boundary.id, text: [boundary.target, boundary.stance, boundary.conditions].filter(Boolean).join(' · ') })) },
    { heading: '行动', items: memory.actions },
  ].filter(section => section.items.length)

  return <>
    {sections.length ? sections.map(({ heading, items }) => <section className='memory-card' key={heading}>
      <h3>{heading}</h3>
      <ul>{items.map(item => <li key={item.id} className='break-words'>{item.text}</li>)}</ul>
    </section>) : <p className='memory-empty'>这段对话还没有已整理的记忆。</p>}
    <div className='memory-actions'>
      <button type='button' disabled={disabled} onClick={onReload}>重新读取</button>
      <button type='button' className='memory-danger' disabled={disabled} onClick={onReset}>整体重置</button>
    </div>
  </>
}
