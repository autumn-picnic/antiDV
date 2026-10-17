import Link from 'next/link'
import Image from 'next/image'
import { brandAssets } from '@/config/brand-assets'

export default function HomeIntro() {
  return (
    <>
      <section id="about" className="home-hero home-screen-1" aria-labelledby="about-title">
        <div className="home-hero-grid">
          <Image className="home-illustration" src={brandAssets.homeIntro} alt="小安把一束温暖的光递给对面的人" width={960} height={720} sizes="(max-width: 767px) 90vw, 480px" priority />
          <div className="home-intro">
            <p className="home-hero-eyebrow">讲出来，让支持发生</p>
            <h1 id="about-title" className="home-hero-title">令你不安的一切，<br />都可以和小安说说。</h1>
            <p className="home-hero-description">如果你正在或担心面临家庭暴力，或仅仅是在关系中感到不安，试着和小安聊一聊，小安陪你一起让自己更安全。</p>
            <Link href="/chat" className="home-chat-link">
              <svg className="home-chat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="8" /><path d="M8 13c1 4 7 4 8 0M9 8v2m6-2v2" />
              </svg>
              <span>和小安说说话···</span>
              <span className="home-chat-action">开始对话</span>
            </Link>
            <p className="home-chat-note">匿名 · 隐私安全 · 随时可清除记录</p>
          </div>
        </div>
        <a href="#welcome" className="home-scroll">向下看看小安能帮你什么<span aria-hidden="true">⌄</span></a>
      </section>
      <section id="welcome" className="home-hero home-screen-2" aria-labelledby="welcome-title">
        <div className="home-hero-grid">
          <div className="home-intro">
            <h2 id="welcome-title" className="home-hero-title">你好，我是<span className="home-title-name">小安</span></h2>
            <p className="home-welcome-description">
              <span className="home-copy-line">国内<span className="home-copy-underline">首个反家暴AI助手</span>，</span>
              <span className="home-copy-line">由一线实务工作者与技术人员共创，</span>
              <span className="home-copy-line">识别处境、梳理选择、走出下一步，</span>
              <span className="home-copy-line">我们一起让自己更安全</span>
            </p>
            <Link href="/chat" className="home-welcome-cta">立即倾诉</Link>
          </div>
          <Image className="home-illustration" src={brandAssets.homeWelcome} alt="戴眼镜、穿紫色外套的小安" width={1214} height={972} sizes="(max-width: 767px) 85vw, 500px" />
        </div>
        <a href="#values" className="home-scroll">谢谢你的信任，一起来认识小安吧<span aria-hidden="true">⌄</span></a>
      </section>
    </>
  )
}
