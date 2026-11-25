import React, { useState } from 'react'
import type { FC } from 'react'
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { ConversationItem } from '@/types/app'

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  list: ConversationItem[]
  onDeleteConversation: (id: string) => void
  onClearAll: () => void
  disabled?: boolean
}

const Sidebar: FC<ISidebarProps> = ({ copyRight, currentId, onCurrentIdChange, list, onDeleteConversation, onClearAll, disabled }) => {
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const conversations = list.filter(item => item.id !== '-1')
  return <div className="chat-history-content">
    <button type="button" className="chat-outline-button" disabled={disabled} onClick={() => onCurrentIdChange('-1')}><PencilSquareIcon aria-hidden="true" />新建对话</button>
    <nav className="chat-history-list" aria-label="已保存的对话">
      {!conversations.length && <p className="chat-panel-note">还没有保存的对话。你可以从一次新的聊天开始。</p>}
      {conversations.map(item => <div key={item.id}>
        <div className={`chat-history-row ${item.id === currentId ? 'is-current' : ''}`}>
          <button type="button" className="chat-history-select" disabled={disabled} aria-current={item.id === currentId ? 'page' : undefined} title={item.name} onClick={() => onCurrentIdChange(item.id)}>{item.name}</button>
          <button type="button" className="chat-history-delete" disabled={disabled} aria-label={`删除对话：${item.name}`} onClick={() => setConfirmation(item.id)}><TrashIcon aria-hidden="true" /></button>
        </div>
        {confirmation === item.id && <div className="chat-delete-confirm" role="group" aria-label="确认删除对话">
          <p>确定删除此对话？删除后无法恢复。</p>
          <button type="button" disabled={disabled} onClick={() => { onDeleteConversation(item.id); setConfirmation(null) }}>确定删除</button>
          <button type="button" onClick={() => setConfirmation(null)}>取消</button>
        </div>}
      </div>)}
    </nav>
    <div className="chat-history-footer">
      {conversations.length > 0 && <button type="button" disabled={disabled} onClick={() => setConfirmation('all')}>清空全部对话</button>}
      {confirmation === 'all' && <div className="chat-delete-confirm" role="group" aria-label="确认清空全部对话">
        <p>确定清空全部对话？此操作无法撤销。</p>
        <button type="button" disabled={disabled} onClick={() => { onClearAll(); setConfirmation(null) }}>确定清空</button>
        <button type="button" onClick={() => setConfirmation(null)}>取消</button>
      </div>}
      <p>© {copyRight} {new Date().getFullYear()}</p>
    </div>
  </div>
}
export default React.memo(Sidebar)
