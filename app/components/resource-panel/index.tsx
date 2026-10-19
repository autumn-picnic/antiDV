'use client'
import type { FC } from 'react'
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
        title: '家暴防治教育资源',
        desc: '家暴防治教育资源：书籍、文章、网站，助你理解与疗愈。',
        href: '/psych-resources',
        tags: ['心理', '疗愈'],
        keywords: ['心理', '治愈', '创伤', '情绪', '疗愈', '恢复', '康复', '愤怒', '焦虑', '抑郁', '压力', '书', '阅读', '学习', '了解', '知识'],
    },
]

/* ─── Dynamic Matching Engine ───────────────────────────── */

function matchResources(chatMessage: string): ResourceItem[] {
    if (!chatMessage || chatMessage.trim() === '') return ALL_RESOURCES

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
const IconClose = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const resourceIcons: Record<string, React.ReactNode> = {
    stories: <IconBook />,
    'docs-toolkit': <IconDoc />,
    resources: <IconMapPin />,
    'psych-resources': <IconMind />,
}

/* ─── Props ─────────────────────────────────────────────── */

export interface ResourcePanelProps {
    /** All AI message text accumulated — used for dynamic matching */
    accumulatedAIText?: string
    /** Mobile: controlled visibility */
    isVisible?: boolean
    /** Mobile: close callback */
    onClose?: () => void
    /** Whether this is rendered as a mobile overlay */
    isMobileOverlay?: boolean
    /** Desktop: collapse state */
    isCollapsed?: boolean
    /** Desktop: toggle collapse callback */
    onToggleCollapse?: () => void
}

/* ─── Component ─────────────────────────────────────────── */

const ResourcePanel: FC<ResourcePanelProps> = ({
    accumulatedAIText = '',
    isVisible = true,
    onClose,
    isMobileOverlay = false,
    isCollapsed = false,
    onToggleCollapse,
}) => {
    const orderedResources = useMemo(() => matchResources(accumulatedAIText), [accumulatedAIText])

    // Determine which resources are "highlighted" (matched keywords)
    const matchedIds = useMemo(() => {
        if (!accumulatedAIText || accumulatedAIText.trim() === '') return new Set<string>()
        const text = accumulatedAIText.toLowerCase()
        return new Set(
            ALL_RESOURCES
                .filter(r => r.keywords.some(kw => text.includes(kw)))
                .map(r => r.id),
        )
    }, [accumulatedAIText])

    const hasMatches = matchedIds.size > 0

    const panelStyle: React.CSSProperties = isMobileOverlay
        ? {
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 300,
            backgroundColor: '#FBF8F4',
            borderLeft: '1px solid #E6DDD5',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 200ms ease-out',
        }
        : {
            width: isCollapsed ? 48 : 300,
            flexShrink: 0,
            backgroundColor: '#FBF8F4',
            borderLeft: '1px solid #E6DDD5',
            display: 'flex',
            flexDirection: 'column',
            overflowY: isCollapsed ? 'hidden' : 'auto',
            height: '100%',
            position: 'relative',
            transition: 'width 200ms ease-out',
        }

    if (!isMobileOverlay && isCollapsed) {
        return (
            <div style={panelStyle}>
                {/* Header — h-12 (48px) to match chat area header */}
                <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #E6DDD5', flexShrink: 0 }}>
                    <button
                        onClick={onToggleCollapse}
                        aria-label="展开资源面板"
                        title="展开"
                        style={{
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#B5A898',
                            borderRadius: 4,
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
        @media (prefers-reduced-motion: reduce) {
          .resource-panel-item, .resource-panel-slide { transition: none !important; }
        }
        .resource-panel-item:hover { background-color: #F5EDE4 !important; }
        .resource-panel-link:focus-visible { outline: 2px solid #E8A87C; outline-offset: 2px; border-radius: 4px; }
      ` }} />

            {/* Mobile overlay backdrop */}
            {isMobileOverlay && isVisible && (
                <div
                    aria-hidden="true"
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(35, 28, 20, 0.25)',
                        zIndex: 59,
                        transition: 'opacity 200ms ease-out',
                    }}
                />
            )}

            <div className="resource-panel-slide" style={panelStyle} role="complementary" aria-label="相关资源推荐">
                {/* Background texture overlay */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'url(https://images.pexels.com/photos/4498238/pexels-photo-4498238.jpeg?auto=compress&cs=tinysrgb&w=400)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.12,
                        pointerEvents: 'none',
                    }}
                />

                {/* Header — h-12 (48px) to match chat area header */}
                <div
                    style={{
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px',
                        borderBottom: '1px solid #E6DDD5',
                        position: 'relative',
                        zIndex: 1,
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {onToggleCollapse && (
                            <button
                                onClick={onToggleCollapse}
                                aria-label="收起资源面板"
                                title="收起"
                                style={{
                                    width: 24,
                                    height: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#B5A898',
                                    borderRadius: 4,
                                    padding: 0,
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        )}
                        <h2
                            style={{
                                fontFamily: "'Noto Serif SC', serif",
                                fontSize: 15,
                                fontWeight: 600,
                                color: '#3D3028',
                                margin: 0,
                            }}
                        >
                            站内资源
                        </h2>
                    </div>
                    {isMobileOverlay && onClose && (
                        <button
                            onClick={onClose}
                            aria-label="关闭资源面板"
                            style={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#7A6B5D',
                                borderRadius: 4,
                            }}
                        >
                            <IconClose />
                        </button>
                    )}
                </div>

                {/* Subtitle */}
                <div style={{ padding: '8px 16px 0', position: 'relative', zIndex: 1, flexShrink: 0 }}>
                    <p style={{ fontSize: 12, color: '#7A6B5D', margin: 0, lineHeight: 1.4 }}>
                        {hasMatches
                            ? '根据对话内容为你推荐相关资源'
                            : accumulatedAIText.trim() === ''
                                ? '开始对话后，我会为你推荐相关资源'
                                : '随时点击探索以下资源'}
                    </p>
                </div>

                {/* Resource List */}
                <div style={{ padding: '12px 0', position: 'relative', zIndex: 1, flex: 1 }}>
                    {accumulatedAIText.trim() === '' && (
                        <div style={{ padding: '48px 20px', textAlign: 'center', color: '#C4B4A4', fontSize: 13, lineHeight: 2 }}>
                            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }}>💬</div>
                            开始倾诉<br />资源将根据对话自动推荐
                        </div>
                    )}
                    {accumulatedAIText.trim() !== '' && orderedResources.map((resource, idx) => {
                        const isHighlighted = matchedIds.has(resource.id)
                        const isFirst = isHighlighted && idx === 0 && hasMatches
                        const LinkWrapper: FC<{ children: React.ReactNode }> = ({ children }) =>
                            resource.isExternal
                                ? <a href={resource.href} target="_blank" rel="noopener noreferrer" className="resource-panel-link" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{children}</a>
                                : <Link href={resource.href} className="resource-panel-link" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{children}</Link>

                        return (
                            <div key={resource.id}>
                                {/* Separator before first non-matching resource */}
                                {hasMatches && !isHighlighted && idx === matchedIds.size && (
                                    <div style={{ padding: '8px 20px 4px' }}>
                                        <hr style={{ border: 'none', borderTop: '1px solid #E6DDD5', margin: 0 }} />
                                        <p style={{ fontSize: 11, color: '#B5A898', marginTop: 8, marginBottom: 0 }}>更多资源</p>
                                    </div>
                                )}

                                <LinkWrapper>
                                    <div
                                        className="resource-panel-item"
                                        style={{
                                            padding: '14px 20px',
                                            borderLeft: isHighlighted ? '3px solid #E8A87C' : '3px solid transparent',
                                            backgroundColor: isFirst ? 'rgba(232,168,124,0.08)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background-color 150ms ease-out',
                                            minHeight: 44,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <span
                                                style={{
                                                    color: isHighlighted ? '#E8A87C' : '#B5A898',
                                                    flexShrink: 0,
                                                    marginTop: 2,
                                                    transition: 'color 150ms ease-out',
                                                }}
                                            >
                                                {resourceIcons[resource.id]}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                    <span
                                                        style={{
                                                            fontSize: 14,
                                                            fontWeight: 600,
                                                            color: isHighlighted ? '#3D3028' : '#5C4D3E',
                                                            fontFamily: "'Noto Serif SC', serif",
                                                        }}
                                                    >
                                                        {resource.title}
                                                    </span>
                                                    {isHighlighted && (
                                                        <span
                                                            style={{
                                                                fontSize: 10,
                                                                color: '#fff',
                                                                backgroundColor: '#E8A87C',
                                                                borderRadius: 3,
                                                                padding: '1px 6px',
                                                                fontWeight: 500,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            推荐
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ fontSize: 12, color: '#7A6B5D', margin: 0, lineHeight: 1.6 }}>
                                                    {resource.desc}
                                                </p>
                                                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    {resource.tags.map(tag => (
                                                        <span
                                                            key={tag}
                                                            style={{
                                                                fontSize: 10,
                                                                color: '#8F7E6E',
                                                                border: '1px solid #E6DDD5',
                                                                borderRadius: 3,
                                                                padding: '1px 6px',
                                                            }}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p style={{ fontSize: 12, color: '#E8A87C', margin: '8px 0 0', fontWeight: 500 }}>
                                                    前往 →
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </LinkWrapper>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '12px 20px',
                        borderTop: '1px solid #E6DDD5',
                        position: 'relative',
                        zIndex: 1,
                        flexShrink: 0,
                    }}
                >
                    <p style={{ fontSize: 11, color: '#B5A898', margin: 0, lineHeight: 1.5, textAlign: 'center' }}>
                        紧急情况请拨&nbsp;
                        <a href="tel:110" style={{ color: '#E8A87C', fontWeight: 600, textDecoration: 'none' }}>110</a>
                        &nbsp;·&nbsp;
                        <a href="tel:12338" style={{ color: '#7CB9A8', fontWeight: 600, textDecoration: 'none' }}>12338</a>
                    </p>
                </div>
            </div>
        </>
    )
}

export default ResourcePanel
