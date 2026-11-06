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
  return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="7" fill="currentColor" /><path d="M22.5 13.4c0 4-3.8 7.1-8.5 7.1-1 0-2-.1-2.9-.4l-3.3 1.8.8-3.2C6.7 17.4 5.5 15.5 5.5 13.4c0-4 3.8-7.1 8.5-7.1s8.5 3.1 8.5 7.1Z" fill="var(--social-icon-paper)" /><path d="M27 19.8c0 1.8-.9 3.4-2.4 4.6l.7 2.5-2.8-1.4c-.8.2-1.6.3-2.5.3-4.1 0-7.5-2.7-7.5-6s3.4-6 7.5-6 7.5 2.7 7.5 6Z" fill="var(--social-icon-paper)" stroke="currentColor" strokeWidth=".8" strokeLinejoin="round" /><g fill="currentColor"><circle cx="10.7" cy="11.7" r="1" /><circle cx="16.7" cy="11.7" r="1" /><circle cx="17.3" cy="18.5" r=".9" /><circle cx="22.5" cy="18.5" r=".9" /></g></svg>
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
        {(['official', 'xiaohongshu', 'instagram'] as const).map((name) => {
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
