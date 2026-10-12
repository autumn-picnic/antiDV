import Link from 'next/link'
import Image from 'next/image'
import { brandAssets } from '@/config/brand-assets'

const screens = [
  {
    id: 'about',
    description: ['如果你曾经经历、正在经历或害怕经历家庭暴力，', '试着和小安聊一聊，我们一起帮助自己更安全。'],
    image: brandAssets.conversation,
    alt: '小安向对面的人递出一盆绿植',
    hint: '还不想开口，往下看看！',
    next: '#welcome',
  },
  {
    id: 'welcome',
    description: ['国内首个反家暴AI助手，', '由一线实务工作者与技术人员共创，', '24小时在线，陪你一起让自己更安全。'],
    image: brandAssets.hero,
    alt: '戴眼镜、穿紫色外套的小安',
    hint: '谢谢你的信任，一起来认识小安吧',
    next: '#values',
  },
]

export default function HomeIntro() {
  return (
    <>
      {screens.map((screen, index) => (
        <section id={screen.id} className={`home-hero home-screen-${index + 1}`} key={screen.id} aria-labelledby={`${screen.id}-title`}>
          <div className="home-hero-grid">
            <div className="home-intro">
              {index === 0
                ? <h1 id={`${screen.id}-title`} className="home-hero-title"><span className="home-copy-line">发生什么事了？</span><span className="home-copy-line">令你不安的一切，</span><span className="home-copy-line">都可以和<span className="home-title-name">小安</span>说说。</span></h1>
                : <h2 id={`${screen.id}-title`} className="home-hero-title">你好，我是<span className="home-title-name">小安</span></h2>}
              <p>{screen.description.map(line => <span className="home-copy-line" key={line}>{line}</span>)}</p>
              <Link href="/chat" className="home-chat-link">
                <svg className="home-chat-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M24 12.5a10 10 0 0 1-10 10H9l-5 3 1.5-6A10 10 0 1 1 24 12.5Z" />
                  <path d="M10 15.5c2 2.5 5 2.5 7 0" /><circle cx="10" cy="10" r=".8" /><circle cx="17" cy="10" r=".8" />
                </svg>
                <span>和小安说说话</span>
                <span className="home-chat-arrow" aria-hidden="true"><svg width="30" height="26" viewBox="0 0 30 26" fill="none"><path d="M4 13h21M17 5l8 8-8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              </Link>
            </div>
            <Image className="home-illustration" src={screen.image} alt={screen.alt} width={index === 0 ? 854 : 1214} height={index === 0 ? 526 : 972} priority={index === 0} />
          </div>
          <a href={screen.next} className="home-scroll">{screen.hint}<span aria-hidden="true">⌄</span></a>
        </section>
      ))}
    </>
  )
}
