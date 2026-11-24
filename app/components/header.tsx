'use client'
import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import AppIcon from '@/app/components/base/app-icon'

export interface IHeaderProps {
  title: string
  accountControls?: React.ReactNode
}

const Header: FC<IHeaderProps> = ({ title, accountControls }) => (
  <header className="chat-topbar">
    <div className="chat-topbar-identity">
      <Link href="/" className="chat-topbar-brand"><AppIcon size="small" rounded /><span>{title}</span></Link>
    </div>
    {accountControls}
  </header>
)

export default React.memo(Header)
