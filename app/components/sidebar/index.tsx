import React, { useState } from 'react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChatBubbleOvalLeftEllipsisIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisSolidIcon } from '@heroicons/react/24/solid'
import Button from '@/app/components/base/button'
// import Card from './card'
import type { ConversationItem } from '@/types/app'

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  list: ConversationItem[]
  onDeleteConversation: (id: string) => void
  onClearAll: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const Sidebar: FC<ISidebarProps> = ({
  copyRight,
  currentId,
  onCurrentIdChange,
  list,
  onDeleteConversation,
  onClearAll,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { t } = useTranslation()
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDeleteId) {
      onDeleteConversation(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div
      className="shrink-0 flex flex-col tablet:h-[calc(100vh_-_3rem)] mobile:h-screen"
      style={{
        width: isCollapsed ? 48 : 244,
        flexBasis: isCollapsed ? 48 : 244,
        backgroundColor: '#FAF6F2',
        borderRight: '1px solid #E6DDD5',
        transition: 'width 200ms ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Header — h-12 (48px) to match chat area header */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid #E6DDD5', flexShrink: 0, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? '展开左边栏' : '收起左边栏'}
          title={isCollapsed ? '展开' : '收起'}
          style={{
            width: 24, height: 24, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#B5A898', borderRadius: 4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed
              ? <polyline points="9 18 15 12 9 6" />
              : <polyline points="15 18 9 12 15 6" />
            }
          </svg>
        </button>
        {!isCollapsed && (
          <h2 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 15, fontWeight: 600, color: '#3D3028', margin: 0,
          }}>
            历史对话
          </h2>
        )}
      </div>

      {/* Content — hidden when collapsed */}
      {!isCollapsed && <>
        {/* New chat + Clear all row */}
        <div className="flex flex-shrink-0 p-4 !pb-0 gap-2">
          <Button
            onClick={() => { onCurrentIdChange('-1') }}
            className="group flex-1 flex-shrink-0 !justify-start !h-9 text-primary-600 items-center text-sm"
          >
            <PencilSquareIcon className="mr-2 h-4 w-4" /> {t('app.chat.newChat')}
          </Button>
          {list.filter(i => i.id !== '-1').length > 0 && (
            <button
              onClick={() => setConfirmClearAll(true)}
              className="flex-shrink-0 h-9 px-2 rounded-lg text-xs transition-colors"
              style={{ backgroundColor: '#F5E6D3', color: '#C26F3A' }}
              title="清空全部对话"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Confirm clear all */}
        {confirmClearAll && (
          <div
            className="mx-4 mt-3 rounded-lg p-3 text-xs"
            style={{ backgroundColor: '#FFF3CD', border: '1px solid #FFCC80', color: '#7B5800' }}
          >
            <p className="font-medium mb-2">确定清空全部对话？此操作无法撤销。</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onClearAll(); setConfirmClearAll(false) }}
                className="px-2 py-1 rounded-md text-white"
                style={{ backgroundColor: '#E8734A' }}
              >确定</button>
              <button
                onClick={() => setConfirmClearAll(false)}
                className="px-2 py-1 rounded-md"
                style={{ backgroundColor: '#E6DDD5', color: '#5C4D3E' }}
              >取消</button>
            </div>
          </div>
        )}

        <nav className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-1 p-4 !pt-0" style={{ backgroundColor: '#FAF6F2' }}>
          {list.map((item) => {
            const isCurrent = item.id === currentId
            const isConfirmingDelete = confirmDeleteId === item.id
            const ItemIcon
              = isCurrent ? ChatBubbleOvalLeftEllipsisSolidIcon : ChatBubbleOvalLeftEllipsisIcon
            return (
              <div key={item.id}>
                <div
                  onClick={() => onCurrentIdChange(item.id)}
                  className={classNames(
                    'group flex items-center rounded-lg px-2 py-2 text-sm font-medium cursor-pointer transition-colors duration-150',
                  )}
                  style={isCurrent
                    ? { backgroundColor: '#F5E6D3', color: '#C26F3A' }
                    : { color: '#5C4D3E' }}
                  onMouseEnter={(e) => { if (!isCurrent) { (e.currentTarget as HTMLElement).style.backgroundColor = '#F2EDE8' } }}
                  onMouseLeave={(e) => { if (!isCurrent) { (e.currentTarget as HTMLElement).style.backgroundColor = '' } }}
                >
                  <ItemIcon
                    className="mr-3 h-5 w-5 flex-shrink-0"
                    style={{ color: isCurrent ? '#C26F3A' : '#B5A898' }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.id !== '-1' && (
                    <button
                      onClick={e => handleDeleteClick(e, item.id)}
                      className="ml-1 p-1 rounded transition-colors hover:bg-black/5"
                      style={{ color: '#B5A898' }}
                      title="删除此对话"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {/* Confirm delete inline */}
                {isConfirmingDelete && (
                  <div
                    className="mx-1 mb-1 rounded-lg p-2 text-xs"
                    style={{ backgroundColor: '#FFF3CD', border: '1px solid #FFCC80', color: '#7B5800' }}
                  >
                    <p className="mb-1.5">确定删除此对话？</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleConfirmDelete}
                        className="px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: '#E8734A' }}
                      >确定</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                        className="px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#E6DDD5', color: '#5C4D3E' }}
                      >取消</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="flex flex-shrink-0 pr-4 pb-4 pl-4">
          <div className="font-normal text-xs" style={{ color: '#B5A898' }}>© {copyRight} {(new Date()).getFullYear()}</div>
        </div>

      </>
      }
    </div>
  )
}

export default React.memo(Sidebar)
