import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import { BookOpenIcon, ClockIcon, PencilSquareIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export interface IHeaderProps {
  accountControls?: React.ReactNode
  title: string
  isSidebarOpen?: boolean
  isResourceOpen?: boolean
  onShowSideBar?: () => void
  onCreateNewChat?: () => void
  onShowResourcePanel?: () => void
  hasSetInputs?: boolean
}

const Header: FC<IHeaderProps> = ({ accountControls, title, isSidebarOpen, isResourceOpen, onShowSideBar, onCreateNewChat, onShowResourcePanel, hasSetInputs }) => (
  <header className="chat-header">
    <div className="chat-brand-row">
      <Link href="/" className="chat-brand" aria-label={`${title}首页`}>小安</Link>
    </div>
    <nav className="chat-toolbar" aria-label="聊天工具">
      <button type="button" aria-expanded={Boolean(isSidebarOpen)} aria-controls={isSidebarOpen ? 'chat-history-drawer' : undefined} onClick={onShowSideBar}>
        <ClockIcon aria-hidden="true" /><span>历史对话</span><ChevronDownIcon className="chat-toolbar-chevron" aria-hidden="true" />
      </button>
      {hasSetInputs && <button type="button" aria-expanded={Boolean(isResourceOpen)} aria-controls={isResourceOpen ? 'chat-resources-drawer' : undefined} onClick={onShowResourcePanel}>
        <BookOpenIcon aria-hidden="true" /><span>支持资源</span><ChevronDownIcon className="chat-toolbar-chevron" aria-hidden="true" />
      </button>}
      {accountControls}
      <button type="button" onClick={onCreateNewChat}><PencilSquareIcon aria-hidden="true" /><span>新建对话</span></button>
    </nav>
  </header>
)

export default React.memo(Header)
