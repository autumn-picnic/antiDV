'use client'

import Link from 'next/link'
import { categories } from './data'

// Temporarily show only official/public support channels and omit empty categories.
const visibleCategories = categories
  .map(category => ({
    ...category,
    resources: category.resources.filter(resource => resource.isOfficial === true),
  }))
  .filter(category => category.resources.length > 0)

/* ── Inline SVG Icons ── */
const SvgPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="电话"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
)
const SvgMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="邮件"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,7 12,13 2,7" /></svg>
)
const SvgClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="时间"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
const SvgPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="地区"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
)
const SvgChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="微信"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
)

const focusStyle = `
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
a:focus-visible { outline: 2px solid #E8A87C; outline-offset: 2px; }
`

export default function ResourcesPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FBF8F4',
      fontFamily: '\'Noto Sans SC\', system-ui, sans-serif',
      color: '#3D3028',
    }}>
      <style dangerouslySetInnerHTML={{ __html: focusStyle }} />

      {/* Header */}
      <header style={{
        height: 56,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        background: '#FBF8F4',
      }}>
        <Link href="/" style={{ color: '#E8A87C', textDecoration: 'none', fontSize: 14 }} aria-label="返回首页">
          ← 返回首页
        </Link>
        <span style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: '\'Noto Serif SC\', serif',
          fontSize: 16,
          color: '#3D3028',
          fontWeight: 600,
        }}>
          资源导航
        </span>
      </header>

      {/* Emergency Banner */}
      <div
        role="alert"
        aria-label="紧急救助热线"
        style={{
          backgroundColor: '#E8A87C',
          padding: '12px 24px',
          textAlign: 'center',
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
          紧急情况请立即拨打：
        </span>
        <a href="tel:110" style={{ color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>110</a>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>·</span>
        <a href="tel:12338" style={{ color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>12338</a>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>·</span>
        <a href="tel:120" style={{ color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>120</a>
      </div>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Category nav — text links with dot separators */}
        <nav style={{ marginBottom: 40, textAlign: 'center' }}>
          {visibleCategories.map((cat, i) => (
            <span key={cat.id}>
              {i > 0 && <span style={{ color: '#E6DDD5', margin: '0 10px' }}>·</span>}
              <a
                href={`#${cat.id}`}
                style={{
                  fontSize: 14,
                  color: '#5C4D3E',
                  textDecoration: 'none',
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {cat.title}
              </a>
            </span>
          ))}
        </nav>

        {/* Categories */}
        {visibleCategories.map(cat => (
          <section key={cat.id} id={cat.id} style={{ marginBottom: 48 }}>
            <h2 style={{
              fontFamily: '\'Noto Serif SC\', serif',
              fontSize: 18,
              color: '#3D3028',
              borderLeft: '3px solid #E8A87C',
              paddingLeft: 12,
              marginBottom: 8,
            }}>
              {cat.title}
            </h2>
            <p style={{ fontSize: 16, color: '#5C4D3E', lineHeight: 1.7, marginBottom: 24 }}>
              {cat.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {cat.resources.map(r => (
                <article
                  key={r.name}
                  style={{
                    borderLeft: '2px solid #E8A87C',
                    paddingLeft: 16,
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#3D3028', marginBottom: 6 }}>
                    {r.name}
                  </h3>
                  <p style={{ fontSize: 16, color: '#5C4D3E', lineHeight: 1.8, marginBottom: 10 }}>
                    {r.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', alignItems: 'center' }}>
                    {r.hotline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#7A6B5D' }}><SvgPhone /></span>
                        <a
                          href={`tel:${r.hotline.split('/')[0].trim().replace(/[^0-9+]/g, '')}`}
                          style={{ fontSize: 16, color: '#E8A87C', fontWeight: 600, textDecoration: 'none' }}
                        >
                          {r.hotline}
                        </a>
                      </div>
                    )}
                    {r.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#7A6B5D' }}><SvgMail /></span>
                        <span style={{ fontSize: 16, color: '#5C4D3E' }}>{r.email}</span>
                      </div>
                    )}
                    {r.hours && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#7A6B5D' }}><SvgClock /></span>
                        <span style={{ fontSize: 16, color: '#7A6B5D' }}>{r.hours}</span>
                      </div>
                    )}
                    {r.region && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#7A6B5D' }}><SvgPin /></span>
                        <span style={{ fontSize: 16, color: '#7A6B5D' }}>{r.region}</span>
                      </div>
                    )}
                    {r.wechat && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#7A6B5D' }}><SvgChat /></span>
                        <span style={{ fontSize: 16, color: '#7A6B5D' }}>{r.wechat}</span>
                      </div>
                    )}
                    {r.weibo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#7A6B5D' }}><SvgChat /></span>
                        <span style={{ fontSize: 16, color: '#7A6B5D' }}>微博：{r.weibo}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* Disclaimer */}
        <div style={{ borderTop: '1px solid #E6DDD5', paddingTop: 20 }}>
          <p style={{ fontSize: 16, color: '#7A6B5D', lineHeight: 1.7 }}>
            以上信息来源于公开资料整理，各机构服务时间和联系方式可能有所变动，请以实际联系时为准。如有错误或更新，欢迎通过首页「联系我们」反馈。
          </p>
        </div>
      </main>
    </div>
  )
}
