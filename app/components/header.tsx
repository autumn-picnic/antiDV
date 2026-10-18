import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import { Bars3Icon, BookOpenIcon, PencilSquareIcon, HomeIcon } from '@heroicons/react/24/outline'
import AppIcon from '@/app/components/base/app-icon'

export interface IHeaderProps {
  title: string
  isMobile?: boolean
  onShowSideBar?: () => void
  onCreateNewChat?: () => void
  onShowResourcePanel?: () => void
  hasSetInputs?: boolean
  accountControls?: React.ReactNode
  settings?: React.ReactNode
}

const Header: FC<IHeaderProps> = ({ title, isMobile, onShowSideBar, onCreateNewChat, onShowResourcePanel, hasSetInputs, accountControls, settings }) => (
  <header className="chat-topbar">
    <div className="chat-topbar-identity">
      <Link href="/" className="chat-topbar-brand"><AppIcon size="small" rounded /><span>{title}</span></Link>
      {accountControls}
    </div>
    <nav aria-label="对话操作" className="chat-topbar-actions">
      {isMobile && <button type="button" onClick={onShowSideBar} aria-label="打开历史对话"><Bars3Icon /></button>}
      <Link href="/" aria-label="返回首页"><HomeIcon /></Link>
      {hasSetInputs && <button type="button" onClick={onShowResourcePanel} aria-label="打开支持资源"><BookOpenIcon /></button>}
      <button type="button" onClick={onCreateNewChat} aria-label="新建对话"><PencilSquareIcon /></button>
      {settings}
    </nav>
  </header>
)

export default React.memo(Header)
