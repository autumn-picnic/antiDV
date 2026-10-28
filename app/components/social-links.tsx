'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { socialLinks, wechatContacts } from '@/config/social-links'
import type { WechatChannel } from '@/config/social-links'

function SocialIcon({ name }: { name: WechatChannel | 'instagram' | 'xiaohongshu' }) {
  if (name === 'instagram') {
    return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="5" y="5" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="2" /><circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="2" /><circle cx="23" cy="9" r="1.5" fill="currentColor" /></svg>
  }
  if (name === 'xiaohongshu') {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="5" width="28" height="22" rx="6" fill="currentColor" /><text x="16" y="20" textAnchor="middle" fill="var(--social-icon-paper)" fontSize="9" fontWeight="700">小红书</text></svg>
  }
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M27 14c0 6-5 10-12 10l-7 4 1-6c-4-2-6-5-6-8C3 8 8 4 15 4s12 4 12 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {name === 'official' && <><circle cx="11" cy="13" r="1.5" fill="currentColor" /><circle cx="19" cy="13" r="1.5" fill="currentColor" /><path d="M12 18h6M25 21l4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>}
      {name === 'assistant' && <><circle cx="15" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M10 20c0-6 10-6 10 0m5 3h6m-3-3v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>}
    </svg>
  )
}

export default function SocialLinks() {
  const [active, setActive] = useState<WechatChannel | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const contact = active ? wechatContacts[active] : null

  useEffect(() => {
    if (!active) {
      return
    }
    const dialog = dialogRef.current
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [active])

  return (
    <>
      <nav className="home-social-links" aria-label="小安的社交媒体">
        {(['official', 'xiaohongshu', 'instagram', 'assistant'] as const).map((name) => {
          if (name === 'xiaohongshu' || name === 'instagram') {
            const label = name === 'xiaohongshu' ? '小红书' : 'Instagram'
            return <a key={name} className="home-social-icon" href={socialLinks[name]} target="_blank" rel="noopener noreferrer" aria-label={`${label}（在新标签页打开）`}><SocialIcon name={name} /><span className="home-social-tooltip" aria-hidden="true">{label}</span></a>
          }
          return <button key={name} className="home-social-icon" type="button" aria-label={wechatContacts[name].label} aria-haspopup="dialog" aria-controls="home-wechat-dialog" onClick={() => setActive(name)}><SocialIcon name={name} /><span className="home-social-tooltip" aria-hidden="true">{wechatContacts[name].label}</span></button>
        })}
      </nav>
      <dialog id="home-wechat-dialog" ref={dialogRef} className="home-social-dialog" aria-labelledby="home-wechat-title" aria-describedby="home-wechat-description" onCancel={() => setActive(null)}>
        <button type="button" className="home-social-close" aria-label="关闭微信联系卡片" onClick={() => setActive(null)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
        {contact && (
          <>
            <div className="home-social-dialog-icon"><SocialIcon name={active!} /></div>
            <h3 id="home-wechat-title">{contact.label}</h3>
            <p id="home-wechat-description">{contact.description}</p>
            {contact.qrSrc
              ? <><Image className="home-social-qr" src={contact.qrSrc} alt={`小安${contact.label}二维码`} width={240} height={240} unoptimized /><p className="home-social-help">电脑上：用微信扫一扫。<br />手机上：保存二维码，在微信扫一扫中从相册选择。</p><a className="home-social-save" href={contact.qrSrc} download>保存二维码</a></>
              : <p className="home-social-unavailable">二维码暂未提供，欢迎先通过电邮联系我们。</p>}
            {contact.account && <p className="home-social-account">{active === 'official' ? '公众号 ID' : '微信标识'}：<strong>{contact.account}</strong><br />{active === 'official' ? '在微信「添加朋友 → 公众号」中搜索此 ID。' : '添加好友请使用小助手二维码。'}</p>}
            {!contact.qrSrc && <a className="home-social-save" href="mailto:support@xiaoan.app">电邮联系小安</a>}
          </>
        )}
      </dialog>
    </>
  )
}
