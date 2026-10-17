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

const values = [
  { title: '安全', image: brandAssets.values.safety, desc: '人身安全与身心安全始终是第一位，是小安的第一位，更是你自己的第一位。' },
  { title: '信任', image: brandAssets.values.trust, desc: '不管几点，说得多乱，说了又反悔，都可以。在这里，你不必完美，不必自证。' },
  { title: '私密', image: brandAssets.values.privacy, desc: '你可以选择愿意分享的内容，随时清空当前对话，或使用「快速离开」离开页面。' },
]

const features = [
  { num: '01', title: '了解发生什么', image: brandAssets.help.understand, tone: 'peach', desc: '很多伤害没有淤青。小安帮你分辨哪些行为算暴力、暴力为什么会循环，为什么这不是你的错', link: '/chat' },
  { num: '02', title: '让自己更安全', image: brandAssets.help.safety, tone: 'sage', desc: '小安为你提供，在你还没决定任何事的时候，就可以先做的准备：安全计划、证据怎么留、紧急时去哪', link: '/chat' },
  { num: '03', title: '拿起法律武器', image: brandAssets.help.legal, tone: 'lavender', desc: '有效报警、及时验伤、申请人身安全保护令、寻求进一步法律援助，小安会告诉你每一步具体怎么办', link: '/chat' },
  { num: '04', title: '重建个人生活', image: brandAssets.help.rebuild, tone: 'blue', desc: '分开后的骚扰怎么应对、创伤修复需要什么、怎么重新开始——这些小安也知道', link: '/chat' },
]

const knowledgeGroups = [
  {
    title: '相关科普',
    items: [
      { num: '01', title: '这也是家暴吗？', desc: '身体、精神、性、经济控制——很多伤害不留痕迹', href: '/psych-resources#understanding-dv' },
      { num: '02', title: '为什么离开这么难？', desc: '暴力循环、习得性无助，以及离开很难的现实原因', href: '/psych-resources#understanding-dv' },
      { num: '03', title: '谁可能遭受家暴？', desc: '同居、前任、同性伴侣、老人、孩子、男性——谁都可能遇到', href: '/psych-resources#understanding-dv' },
    ],
  },
  {
    title: '行动资源',
    items: [
      { num: '04', title: '身边人受暴怎么办？', desc: '如何倾听、怎么避免二次伤害、可以做些什么支持TA', href: '/psych-resources#support-communities' },
      { num: '05', title: '法律资源有哪些？', desc: '《反家庭暴力法》、保护令、告诫书，以及实际怎么用', href: '/resources#legal-aid' },
      { num: '06', title: '反家暴资源地图', desc: '咨询热线、反家暴庇护所、法律援助、心理咨询', href: '/resources' },
    ],
  },
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
          <a href="#support">小安帮你</a>
          <a href="#questions">关于家暴</a>
          <a href="#welcome">小安是谁</a>
          <a href="#message">有话要说</a>
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
              <Image src={feature.image} alt="" width={200} height={200} sizes="(max-width: 767px) 120px, 170px" className="home-support-art" />
            </Link>
          ))}
        </div>
      </section>

      <section id="questions" className="home-knowledge" aria-labelledby="knowledge-title">
        <h2 id="knowledge-title">关于<span>家暴</span>，你可能想知道的</h2>
        <blockquote className="home-knowledge-intro">
          <p>家庭暴力不是家务事，是违法行为。</p>
          <p>反对家庭暴力不是受暴者一个人的事，而需要全社会一起努力。</p>
          <p>了解更多家暴相关知识，为了更好支持自己、支持他人。</p>
        </blockquote>
        <div className="home-knowledge-panel">
          {knowledgeGroups.map(group => (
            <div key={group.title} className="home-knowledge-group">
              <h3>{group.title}</h3>
              <div className="home-knowledge-grid">
                {group.items.map(item => (
                  <Link key={item.num} href={item.href} className="home-knowledge-link">
                    <h4><span aria-hidden="true">{item.num}</span>{item.title}</h4>
                    <p>{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="home-contact" aria-labelledby="contact-title">
        <h2 id="contact-title">联系我们</h2>
        <div className="home-contact-grid">
          <ul className="home-contact-copy">
            <li>小安由反家暴领域研究者、一线社工和技术团队共同搭建。</li>
            <li>里面的每一条建议，都经过实务工作者校对——不是法条的复制粘贴，而是这些事在国内真实办起来是什么样。</li>
            <li>因为小安希望为每一位家暴亲历者提供及时、可信赖、有效的支持</li>
          </ul>
          <Image src={brandAssets.contact} alt="小安团队成员接听电话的插画" width={702} height={702} sizes="(max-width: 767px) 280px, 320px" className="home-contact-art" />
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────── */}
      <section id="faq" style={{ maxWidth: 680, margin: '0 auto', padding: '72px 24px' }}>
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

      <section id="message" className="home-message" aria-labelledby="message-title">
        <h2 id="message-title">有话要说</h2>
        <p>留言信息不会公开，仅供团队查看。</p>
        <ContactForm />
        <nav className="home-resource-links" aria-label="更多支持资源">
          <Link href="/resources">线下支援导航 →</Link>
          <Link href="/psych-resources">资源支持库 →</Link>
          <Link href="/stories">受害者故事 →</Link>
          <Link href="/docs-toolkit">文档工具库 →</Link>
        </nav>
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
