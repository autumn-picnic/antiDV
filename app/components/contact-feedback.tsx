'use client'

import { useState } from 'react'
import ContactForm from './contact-form'

export default function ContactFeedback() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="home-message-actions">
        <a href="mailto:support@xiaoan.app"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="2" y="5" width="28" height="22" rx="3" fill="currentColor" /><path d="m3 7 13 11L29 7M3 25l9-9m17 9-9-9" stroke="white" strokeWidth="2" /></svg>support@xiaoan.app</a>
        <button type="button" aria-expanded={open} aria-controls="contact-form" onClick={() => setOpen(value => !value)}><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 3h22a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H15l-8 5v-5H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" fill="currentColor" /><path d="M9 10h14M9 16h10" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>在线反馈表单</button>
      </div>
      <div id="contact-form" className="home-message-form" hidden={!open}>
        <ContactForm />
      </div>
    </>
  )
}
