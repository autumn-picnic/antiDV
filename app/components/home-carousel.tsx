'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { brandAssets } from '@/config/brand-assets'

const slides = [
  {
    title: ['你好，我是小安'],
    description: ['国内首个反家暴AI助手，', '由一线实务工作者与技术人员共创，', '24小时在线，陪你一起让自己更安全。'],
    image: brandAssets.hero,
    alt: '戴眼镜、穿紫色外套的小安',
    hint: '谢谢你的信任，一起来认识小安吧',
  },
  {
    title: ['发生什么事了？', '令你不安的一切，', '都可以和小安说说。'],
    description: ['如果你曾经经历、正在经历或害怕经历家庭暴力，', '试着和小安聊一聊，我们一起帮助自己更安全。'],
    image: brandAssets.conversation,
    alt: '小安向对面的人递出一盆绿植',
    hint: '还不想开口，往下看看！',
  },
]

export default function HomeCarousel() {
  const viewport = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const changeSlide = (index: number) => {
    const element = viewport.current
    if (!element)
    { return }
    element.scrollTo({
      left: index * element.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }

  return (
    <section id="about" className="home-carousel" aria-label="认识小安" aria-roledescription="轮播">
      <div
        className="home-carousel-viewport"
        ref={viewport}
        tabIndex={0}
        aria-label="首页介绍，使用左右方向键切换"
        onScroll={(event) => {
          const element = event.currentTarget
          setActive(Math.round(element.scrollLeft / element.clientWidth))
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            changeSlide(event.key === 'ArrowLeft' ? 0 : 1)
          }
        }}
      >
        {slides.map((slide, index) => (
          <div className={`home-hero home-hero-${index + 1}`} key={slide.image} role="group" aria-roledescription="幻灯片" aria-label={`${index + 1} / 2`} aria-hidden={active !== index}>
            <div className="home-hero-grid">
              <div className="home-intro">
                {index === 0
                  ? <h1 className="home-hero-title">你好，我是<span className="home-title-name">小安</span></h1>
                  : <h2 className="home-hero-title">{slide.title.map(line => <span className="home-copy-line" key={line}>{line.includes('小安') ? <>都可以和<span className="home-title-name">小安</span>说说。</> : line}</span>)}</h2>}
                <p>{slide.description.map(line => <span className="home-copy-line" key={line}>{line}</span>)}</p>
                <Link href="/chat" className="home-chat-link" tabIndex={active === index ? 0 : -1}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  <span>和小安说说话</span><span aria-hidden="true">→</span>
                </Link>
              </div>
              <Image className="home-illustration" src={slide.image} alt={slide.alt} width={index === 0 ? 1214 : 854} height={index === 0 ? 972 : 526} priority={index === 0} />
            </div>
            <a href="#values" className="home-scroll" tabIndex={active === index ? 0 : -1}>{slide.hint}<span aria-hidden="true">⌄</span></a>
          </div>
        ))}
      </div>
      <div className="home-carousel-controls" aria-label="首页切换">
        <button type="button" onClick={() => changeSlide(0)} aria-label="上一张首页" disabled={active === 0}>←</button>
        {slides.map((slide, index) => <button type="button" key={slide.image} className="home-carousel-dot" onClick={() => changeSlide(index)} aria-label={`切换至首页${index + 1}`} aria-pressed={active === index}><span /></button>)}
        <button type="button" onClick={() => changeSlide(1)} aria-label="下一张首页" disabled={active === 1}>→</button>
      </div>
    </section>
  )
}
