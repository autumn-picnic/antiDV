import type { Metadata } from 'next'
import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ContactForm from '@/app/components/contact-form'
import ScrollReveal from '@/app/components/scroll-reveal'
import { brandAssets } from '@/config/brand-assets'
import './styles/figma-home.css'
import AppIcon from '@/app/components/base/app-icon'
import HomeIntro from '@/app/components/home-carousel'

export const metadata: Metadata = {
  title: {
    absolute: '小安 — 反家暴AI支持助手',
  },
  alternates: {
    canonical: 'https://anti-dv.vercel.app/',
  },
  description:
    '小安是专注于反家庭暴力的AI支持助手，提供安全、保密的情感支持，24小时在线。并汇集全国庇护所、法律援助、心理咨询等资源，帮助你找到下一步。',
  openGraph: {
    title: '小安 — 反家暴AI支持助手',
    description:
      '安全 · 保密 · 随时在线。专注于反家庭暴力的AI支持助手，提供情感支持与资源导航。',
    url: 'https://anti-dv.vercel.app/',
  },
}

/* ── Inline SVG Icons (stroke 1.5, 20×20, no external deps) ── */
const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="电话">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="邮件">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="22,7 12,13 2,7" />
  </svg>
)
const IconWechat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="微信">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const values = [
  { title: '安全', image: brandAssets.values.safety, desc: '人身安全与身心安全始终是第一位，是小安的第一位，更是你自己的第一位。' },
  { title: '信任', image: brandAssets.values.trust, desc: '不管几点，说得多乱，说了又反悔，都可以。在这里，你不必完美，不必自证。' },
  { title: '私密', image: brandAssets.values.privacy, desc: '你可以选择愿意分享的内容，随时清空当前对话，或使用「快速离开」离开页面。' },
]

const features = [
  { num: '01', title: '了解发生什么', image: brandAssets.help.understand, tone: 'peach', desc: '很多伤害没有淤青。小安帮你分辨哪些行为算暴力、暴力为什么会循环，以及为什么这不是你的错。', link: '/chat' },
  { num: '02', title: '准备安全计划', image: brandAssets.help.safety, tone: 'sage', desc: '有些决定很难立马做出，但你可以先了解：什么是安全计划、证据如何保存、紧急时需要做些什么。', link: '/chat' },
  { num: '03', title: '寻求法律支持', image: brandAssets.help.legal, tone: 'lavender', desc: '有效报警、及时验伤、申请人身安全保护令、寻求法律援助——小安会告诉你每一步具体怎么办。', link: '/chat' },
  { num: '04', title: '重塑个人生活', image: brandAssets.help.rebuild, tone: 'blue', desc: '分开后面临骚扰和威胁怎么办、身心创伤如何应对、重新开始可以从哪里开始——这些小安也知道。', link: '/chat' },
]

const faqs = [
  {
    q: '我的对话记录会被保存吗？',
    a: '小安不会在你的设备上长期保存对话内容。使用完毕后，建议点击「快速离开」按钮清除当前记录。',
  },
  {
    q: '如果我身处危险，小安能帮我吗？',
    a: '如果你现在面临紧急危险，请立即拨打 110 报警。小安可以提供情感支持和资源信息，但无法替代紧急救援服务。',
  },
  {
    q: '我需要先确认自己是不是「家暴受害者」才能使用吗？',
    a: '不需要。只要你感到不安全、受到伤害或需要倾诉，都可以找小安聊。',
  },
  {
    q: '小安是真人还是AI？',
    a: '小安是一个AI助手，由人工智能驱动。它不能替代专业心理咨询师或社工，但可以在你需要时第一时间陪伴你。',
  },
]

const reducedMotionStyle = `
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
details[open] summary .faq-arrow { transform: rotate(90deg); }
details summary .faq-arrow { transition: transform 200ms ease-out; display: inline-block; }
summary::-webkit-details-marker { display: none; }
summary::marker { display: none; }
a:focus-visible, button:focus-visible, summary:focus-visible {
  outline: 2px solid #E8A87C; outline-offset: 2px;
}
`

const LandingPage: FC = () => {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.a,
      },
    })),
  }

  return (
    <div
      className="figma-home"
      style={{
        minHeight: '100vh',
        backgroundColor: '#FBF9F6',
        fontFamily: '\'Noto Sans SC\', system-ui, sans-serif',
        color: '#3D3028',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <style dangerouslySetInnerHTML={{ __html: reducedMotionStyle }} />

      <header className="home-header">
        <Link href="/" className="home-brand" aria-label="小安首页">
          <AppIcon size="small" rounded />
          <span>小安</span>
        </Link>
        <nav aria-label="主导航" className="home-nav">
          <Link href="/" aria-current="page">首页</Link>
          <a href="#about">小安是谁</a>
          <a href="#support">小安帮你</a>
          <a href="#questions">关于家暴</a>
          <a href="#contact">联系我们</a>
          <a href="#contact">有话要说</a>
        </nav>
      </header>
      <HomeIntro />

      <section id="values" className="home-values" aria-labelledby="values-title">
        <h2 id="values-title">定位说明</h2>
        <div className="home-values-grid">
          {values.map(value => (
            <article key={value.title} className="home-value-card">
              <Image src={value.image} alt="" width={310} height={278} className="home-value-art" />
              <div className="home-value-copy"><h3>{value.title}</h3><p>{value.desc}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section id="support" className="home-support" aria-labelledby="support-title">
        <h2 id="support-title">小安帮你</h2>
        <div className="home-support-grid">
          {features.map(feature => (
            <Link key={feature.num} href={feature.link} className={`home-support-card home-support-${feature.tone}`}>
              <div className="home-support-copy">
                <h3><span className="home-support-number" aria-hidden="true">{feature.num}</span>{feature.title}</h3>
                <p>{feature.desc}</p>
                <span className="home-support-arrow" aria-hidden="true">⟶</span>
              </div>
              <Image src={feature.image} alt="" width={200} height={220} className="home-support-art" />
            </Link>
          ))}
        </div>
        <nav className="home-resource-links" aria-label="更多支持资源">
          <Link href="/resources">线下支援导航 →</Link>
          <Link href="/psych-resources">资源支持库 →</Link>
          <Link href="/stories">受害者故事 →</Link>
          <Link href="/docs-toolkit">文档工具库 →</Link>
        </nav>
      </section>

      {/* ─── FAQ ──────────────────────────────────── */}
      <section id="questions" style={{ maxWidth: 680, margin: '0 auto', padding: '72px 24px' }}>
        <h2
          style={{
            fontFamily: '\'Noto Serif SC\', serif',
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 36,
            color: '#3D3028',
          }}
        >
          常见问题
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {faqs.map((faq, i) => (
            <ScrollReveal key={faq.q} delay={`${i * 50}ms`}>
              <details
                key={faq.q}
                style={{ borderBottom: '1px solid #E6DDD5', padding: '20px 0' }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 16,
                    color: '#3D3028',
                    listStyle: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 44,
                  }}
                >
                  {faq.q}
                  <span className="faq-arrow" style={{ color: '#E8A87C', flexShrink: 0, fontSize: 14 }}>▸</span>
                </summary>
                <p style={{ fontSize: 16, color: '#5C4D3E', marginTop: 12, lineHeight: 1.8 }}>
                  {faq.a}
                </p>
              </details>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ─── Contact ──────────────────────────────── */}
      <section id="contact" style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 72px' }}>
        <hr style={{ border: 'none', borderTop: '1px solid #E6DDD5', marginBottom: 48 }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 40,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: '\'Noto Serif SC\', serif',
                fontSize: 22,
                fontWeight: 600,
                color: '#3D3028',
                marginBottom: 12,
              }}
            >
              联系我们
            </h2>
            <p style={{ fontSize: 16, color: '#5C4D3E', lineHeight: 1.8, marginBottom: 28 }}>
              如有合作意向、问题反馈或需要进一步帮助，欢迎联系我们。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: <IconPhone />, label: '联系电话', value: '请联系机构负责人' },
                { icon: <IconWechat />, label: '微信公众号', value: '请联系机构负责人' },
                { icon: <IconMail />, label: '电子邮件', value: '请联系机构负责人' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#7A6B5D' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, color: '#7A6B5D', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#3D3028' }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#3D3028', marginBottom: 4 }}>
              给我们留言
            </h3>
            <p style={{ fontSize: 12, color: '#7A6B5D', marginBottom: 20 }}>
              留言信息不会公开，仅供团队查看。
            </p>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────── */}
      <footer
        style={{
          backgroundColor: '#3D3028',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, color: '#FBF8F4', marginBottom: 12 }}>
          紧急求助热线
        </p>
        <p style={{ fontSize: 16, color: '#FBF8F4', marginBottom: 20 }}>
          <a href="tel:110" style={{ color: '#E8A87C', fontWeight: 700, marginRight: 24 }}>
            110 报警
          </a>
          <a href="tel:12338" style={{ color: '#7CB9A8', fontWeight: 700, marginRight: 24 }}>
            12338 妇女热线
          </a>
          <a href="tel:120" style={{ color: '#D4A574', fontWeight: 700 }}>
            120 急救
          </a>
        </p>
        <p style={{ fontSize: 12, color: '#B5A898' }}>
          © {new Date().getFullYear()} 小安 反家暴AI助手 · 如有需要请联系当地社会服务机构
        </p>
      </footer>
    </div>
  )
}

export default LandingPage
