import type { Metadata } from 'next'
import type { FC } from 'react'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ContactFeedback from '@/app/components/contact-feedback'
import { ChevronDoubleUpIcon } from '@heroicons/react/24/outline'
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
  { title: '安全', image: brandAssets.values.safety, width: 514, height: 470, desc: '人身安全与身心安全始终是第一位，是小安的第一位，更是你自己的第一位。' },
  { title: '信任', image: brandAssets.values.trust, width: 612, height: 408, desc: '你有权利讲述真实经历与感受，并且不被评判，小安希望信任你，然后被你信任。' },
  { title: '私密', image: brandAssets.values.privacy, width: 450, height: 412, desc: '对话数据经过严格脱敏与加密，绝不商用。你可以随时清空记录，随时安全离开。' },
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
      { num: '05', title: '法律资源有哪些？', desc: '《反家庭暴力法》、保护令、告诫书，以及实际怎么用', href: '/psych-resources#legal-knowledge' },
      { num: '06', title: '反家暴资源地图', desc: '咨询热线、反家暴庇护所、法律援助、心理咨询', href: '/resources' },
    ],
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
  return (
    <div
      className="figma-home"
      style={{
        minHeight: '100vh',
        backgroundColor: '#FBF9F6',
        fontFamily: '\'PingFang SC\', \'Noto Sans SC\', \'Microsoft YaHei\', system-ui, sans-serif',
        color: '#3D3028',
      }}
    >
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
              <div className={`home-value-image home-value-image-${value.title === '安全' ? 'safety' : value.title === '信任' ? 'trust' : 'privacy'}`}><Image src={value.image} alt="" width={value.width} height={value.height} sizes="(max-width: 767px) calc(100vw - 48px), 350px" className="home-value-art" /></div>
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
                <span className="home-support-arrow" aria-hidden="true"><svg width="50" height="8" viewBox="0 0 50 8"><path d="M0 4h43" stroke="currentColor" strokeWidth="1.5" /><path d="m42 1 8 3-8 3Z" fill="currentColor" /></svg></span>
              </div>
              <Image src={feature.image} alt="" width={200} height={200} sizes="(max-width: 767px) 120px, 170px" unoptimized={feature.num === '04'} className="home-support-art" />
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

      <section id="message" className="home-message" aria-labelledby="message-title">
        <h2 id="message-title">有话想对我们说</h2>
        <div className="home-message-intro">
          <p>用得不顺、答得不对、或者你想到了小安该改的地方——都欢迎告诉我们！</p>
          <p>你的安全和隐私是第一位的</p>
          <p>反馈可以匿名，我们不会主动联系你，除非你留下方式并希望我们回复</p>
        </div>
        <ContactFeedback />
        <a href="#about" className="home-message-return"><ChevronDoubleUpIcon aria-hidden="true" />你今天只是看了看，也很好。<br />小安随时都在。</a>
      </section>

    </div>
  )
}

export default LandingPage
