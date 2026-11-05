'use client'
import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import { Bars3Icon, BookOpenIcon, HomeIcon } from '@heroicons/react/24/outline'
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

const Header: FC<IHeaderProps> = ({ title, isMobile, onShowSideBar, onShowResourcePanel, hasSetInputs, accountControls, settings }) => (
  <header className="chat-topbar">
    <div className="chat-topbar-identity">
      <Link href="/" className="chat-topbar-brand"><AppIcon size="small" rounded /><span>{title}</span></Link>

    </div>
    <details className="chat-toolbar" onKeyDown={(event) => {
      if (event.key !== 'Escape' || event.nativeEvent.isComposing || event.defaultPrevented) { return }
      const layer = event.currentTarget.querySelector<HTMLDetailsElement>('details[open]') || event.currentTarget
      layer.open = false
      layer.querySelector('summary')?.focus()
      event.preventDefault()
      event.stopPropagation()
    }}>
      <summary aria-label="显示或隐藏对话工具">工具</summary>
      <nav aria-label="对话操作" className="chat-topbar-actions">
      {isMobile && <button type="button" onClick={onShowSideBar} aria-label="打开历史对话"><Bars3Icon /></button>}
      <Link href="/" aria-label="返回首页"><HomeIcon /></Link>
      {hasSetInputs && <button type="button" onClick={onShowResourcePanel} aria-label="打开支持资源"><BookOpenIcon /></button>}

      {settings}
      </nav>
    </details>
  </header>
)

export default React.memo(Header)
