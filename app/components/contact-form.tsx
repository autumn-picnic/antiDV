'use client'
import React, { useState } from 'react'

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #E6DDD5',
    borderRadius: 10,
    backgroundColor: '#FBF8F4',
    color: '#3D2C1E',
    fontSize: 14,
    outlineOffset: 3,
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#5C4D3E',
    marginBottom: 6,
}

export default function ContactForm() {
    const [form, setForm] = useState({
        name: '',
        phone: '',
        wechat: '',
        email: '',
        message: '',
    })
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.message.trim()) {
            setErrorMsg('请填写留言内容')
            return
        }
        setStatus('submitting')
        setErrorMsg('')
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) {
                setErrorMsg(data.message || data.error || '提交失败，请稍后再试')
                setStatus('error')
            }
            else {
                setStatus('success')
                setForm({ name: '', phone: '', wechat: '', email: '', message: '' })
            }
        }
        catch {
            setErrorMsg('网络错误，请稍后再试')
            setStatus('error')
        }
    }

    if (status === 'success') {
        return (
            <div role="status" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <p aria-hidden="true" style={{ fontSize: 36, color: '#2C6B5E', marginBottom: 16 }}>✓</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#2C6B5E', marginBottom: 8 }}>留言已收到，感谢你的反馈！</p>
                <p style={{ fontSize: 13, color: '#8F7E6E', marginBottom: 24 }}>我们会认真阅读你的反馈；只有你希望回复并留下联系方式时，我们才会联系你。</p>
                <button
                    onClick={() => setStatus('idle')}
                    style={{
                        padding: '8px 24px',
                        borderRadius: 20,
                        border: 'none',
                        backgroundColor: '#E8A87C',
                        color: '#fff',
                        fontSize: 14,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    再次留言
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} noValidate aria-label="匿名反馈表单">
            {/* Optional contact info */}
            <p style={{ fontSize: 12, color: '#B5A898', marginBottom: 20, lineHeight: 1.8 }}>
                以下联系方式均为<strong>选填</strong>，你可以完全匿名留言。只有希望我们回复时，才需要留下一种联系方式。
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                    <label htmlFor="contact-name" style={labelStyle}>姓名（选填）</label>
                    <input
                        type="text"
                        placeholder="你的称呼"
                        id="contact-name"
                        value={form.name}
                        onChange={set('name')}
                        maxLength={50}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label htmlFor="contact-phone" style={labelStyle}>手机号码（选填）</label>
                    <input
                        type="tel"
                        placeholder="例：138 0000 0000"
                        id="contact-phone"
                        value={form.phone}
                        onChange={set('phone')}
                        maxLength={20}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label htmlFor="contact-wechat" style={labelStyle}>微信号（选填）</label>
                    <input
                        type="text"
                        placeholder="你的微信号"
                        id="contact-wechat"
                        value={form.wechat}
                        onChange={set('wechat')}
                        maxLength={50}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label htmlFor="contact-email" style={labelStyle}>邮箱（选填）</label>
                    <input
                        type="email"
                        placeholder="example@mail.com"
                        id="contact-email"
                        value={form.email}
                        onChange={set('email')}
                        maxLength={100}
                        style={inputStyle}
                    />
                </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 8 }}>
                <label htmlFor="contact-message" style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
                    <span>留言内容 <span style={{ color: '#E8734A' }}>*</span></span>
                    <span style={{ fontWeight: 400, color: '#B5A898' }}>{form.message.length} / 2000</span>
                </label>
                <textarea
                    id="contact-message"
                    aria-describedby={errorMsg ? 'contact-error' : undefined}
                    aria-invalid={!!errorMsg}
                    placeholder="请写下你想说的话，比如：对小安的建议、遇到的困难、想要的帮助……"
                    value={form.message}
                    onChange={set('message')}
                    maxLength={2000}
                    rows={5}
                    required
                    style={{
                        ...inputStyle,
                        resize: 'vertical',
                        minHeight: 120,
                        lineHeight: 1.7,
                    }}
                />
            </div>

            {errorMsg && (
                <p id="contact-error" role="alert" style={{ fontSize: 13, color: '#B54727', marginBottom: 12 }}>{errorMsg}</p>
            )}

            <button
                type="submit"
                disabled={status === 'submitting'}
                style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 28,
                    border: 'none',
                    backgroundColor: status === 'submitting' ? '#D4C8BC' : '#E8A87C',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background-color 0.2s',
                    letterSpacing: '0.04em',
                }}
            >
                {status === 'submitting' ? '提交中…' : '提交留言'}
            </button>
        </form>
    )
}
