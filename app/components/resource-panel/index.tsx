'use client'
import React, { useMemo } from 'react'
import Link from 'next/link'

/* ─── Resource Definitions ──────────────────────────────── */

interface ResourceItem {
    id: string
    title: string
    desc: string
    href: string
    isExternal?: boolean
    tags: string[]
    /** Keywords in AI responses that should surface this resource */
    keywords: string[]
}

const ALL_RESOURCES: ResourceItem[] = [
    {
        id: 'stories',
        title: '受害者故事',
        desc: '阅读走出困境的真实故事，她们也曾和你一样。',
        href: '/stories',
        tags: ['故事', '力量'],
        keywords: ['故事', '经历', '不是一个人', '她们', '走出', '有人', '类似', '案例', '真实'],
    },
    {
        id: 'docs-toolkit',
        title: '文档工具库',
        desc: '人身保护令、告诫书等法律文书模板，填写即生成。',
        href: '/docs-toolkit',
        tags: ['文书', '法律'],
        keywords: ['法律', '文书', '保护令', '告诫书', '起诉', '离婚', '证据', '法院', '申请', '诉讼', '模板', '文件', '维权'],
    },
    {
        id: 'resources',
        title: '资源导航',
        desc: '庇护所、心理咨询、法律援助等资源汇总。',
        href: '/resources',
        tags: ['热线', '援助'],
        keywords: ['热线', '庇护', '援助', '咨询', '帮助', '机构', '电话', '联系', '社工', '支援', '妇联', '中心'],
    },
    {
        id: 'psych-resources',
        title: '心理资源支持库',
        desc: '家暴防治教育资源：书籍、文章、网站，助你理解与疗愈。',
        href: '/psych-resources',
        tags: ['心理', '疗愈'],
        keywords: ['心理', '治愈', '创伤', '情绪', '疗愈', '恢复', '康复', '愤怒', '焦虑', '抑郁', '压力', '书', '阅读', '学习', '了解', '知识'],
    },
]

/* ─── Dynamic Matching Engine ───────────────────────────── */

function matchResources(chatMessage: string): ResourceItem[] {
    if (!chatMessage || chatMessage.trim() === '') { return ALL_RESOURCES }

    const text = chatMessage.toLowerCase()

    const scored = ALL_RESOURCES.map(resource => {
        const score = resource.keywords.reduce((acc, kw) => {
            return acc + (text.includes(kw) ? 1 : 0)
        }, 0)
        return { resource, score }
    })

    // Sort: matching resources first (by score desc), then unmatched
    scored.sort((a, b) => b.score - a.score)
    return scored.map(s => s.resource)
}

/* ─── SVG Icons ─────────────────────────────────────────── */

const IconBook = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)
const IconDoc = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
)
const IconMapPin = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
)
const IconMind = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l2 2" />
    </svg>
)
const resourceIcons: Record<string, React.ReactNode> = {
    stories: <IconBook />,
    'docs-toolkit': <IconDoc />,
    resources: <IconMapPin />,
    'psych-resources': <IconMind />,
}

export default function ResourcePanel({ accumulatedAIText = '' }: { accumulatedAIText?: string }) {
    const resources = useMemo(() => matchResources(accumulatedAIText), [accumulatedAIText])
    const text = accumulatedAIText.toLowerCase()
    return <div className="chat-resource-content">
        <p className="chat-panel-note">{text.trim() ? '根据对话内容为你推荐相关资源' : '随时点击探索以下资源'}</p>
        <div className="chat-resource-list">
            {resources.map(resource => <Link key={resource.id} href={resource.href} className="chat-resource-card">
                <span className="chat-resource-icon" aria-hidden="true">{resourceIcons[resource.id]}</span>
                <div><h3>{resource.title}</h3><p>{resource.desc}</p>
                    {text && resource.keywords.some(word => text.includes(word)) && <span className="chat-resource-tag">与当前对话相关</span>}
                </div>
            </Link>)}
        </div>
    </div>
}
