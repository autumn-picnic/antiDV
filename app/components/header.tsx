'use client'
import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import { Bars3Icon } from '@heroicons/react/24/outline'
import AppIcon from '@/app/components/base/app-icon'

export interface IHeaderProps {
  title: string
  accountControls?: React.ReactNode
  isSidebarOpen?: boolean
  onShowSideBar?: () => void
}

const Header: FC<IHeaderProps> = ({ title, accountControls, isSidebarOpen, onShowSideBar }) => (
  <header className="chat-topbar">
    <div className="chat-topbar-identity">
      <Link href="/" className="chat-topbar-brand"><AppIcon size="small" rounded /><span>{title}</span></Link>
    </div>
    <button
      type="button"
      className="chat-history-toggle"
      onClick={onShowSideBar}
      aria-label="打开历史对话"
      aria-expanded={Boolean(isSidebarOpen)}
      aria-haspopup="dialog"
      aria-controls={isSidebarOpen ? 'history-content' : undefined}
    >
      <Bars3Icon className="h-5 w-5" aria-hidden="true" />
      <span>历史 / 新对话</span>
    </button>
    {accountControls}
  </header>
)

export default React.memo(Header)
