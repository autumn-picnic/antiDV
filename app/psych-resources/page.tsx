import type { FC } from 'react'
import Link from 'next/link'
import { psychResources } from './data'

export const revalidate = 86400

const focusStyle = `
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
a:focus-visible { outline: 2px solid #E8A87C; outline-offset: 2px; }
.resource-card:hover { background-color: #F5EDE6 !important; }
.resources-scroll {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #E6DDD5 transparent;
  padding-bottom: 8px;
}
.resources-scroll::-webkit-scrollbar {
  height: 4px;
}
.resources-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.resources-scroll::-webkit-scrollbar-thumb {
  background-color: #E6DDD5;
  border-radius: 2px;
}
`

const typeLabel: Record<string, string> = {
    book: '书籍',
    article: '文章',
    website: '网站',
    guide: '指南',
}

const typeColor: Record<string, string> = {
    book: '#7CB9A8',
    article: '#E8A87C',
    website: '#B5A898',
    guide: '#C4956A',
}

const PsychResourcesPage: FC = () => {
    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#FBF8F4',
                fontFamily: "'Noto Sans SC', system-ui, sans-serif",
                color: '#3D3028',
            }}
        >
            <style dangerouslySetInnerHTML={{ __html: focusStyle }} />

            {/* Masthead */}
            <header
                style={{
                    backgroundColor: '#3D3028',
                    padding: '48px 24px',
                    textAlign: 'center',
                }}
            >
                <Link
                    href="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 14,
                        color: '#E8A87C',
                        textDecoration: 'none',
                        marginBottom: 32,
                        minHeight: 44,
                    }}
                >
                    ← 首页
                </Link>
                <h1
                    style={{
                        fontFamily: "'Noto Serif SC', serif",
                        fontSize: 32,
                        fontWeight: 700,
                        color: '#FBF8F4',
                        marginBottom: 12,
                    }}
                >
                    家暴防治教育资源
                </h1>
                <p style={{ fontSize: 16, color: '#B5A898', fontStyle: 'italic', marginBottom: 16 }}>
                    家暴防治教育资源
                </p>
                <div style={{ width: 64, height: 1, backgroundColor: '#E8A87C', margin: '0 auto 16px' }} />
                <p
                    style={{
                        fontSize: 13,
                        color: '#D4C4B8',
                        maxWidth: 540,
                        margin: '0 auto',
                        lineHeight: 1.8,
                    }}
                >
                    这里汇集了有关家庭暴力、创伤疗愈与法律权益的精选资源。
                    <br />
                    无论你处于哪个阶段，都能在这里找到支持。
                </p>
            </header>

            {/* Content */}
            <main style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px 96px' }}>

                {/* Category navigation */}
                <nav
                    aria-label="资源分类"
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 52,
                    }}
                >
                    {psychResources.map(cat => (
                        <a
                            key={cat.id}
                            href={`#${cat.id}`}
                            style={{
                                fontSize: 13,
                                color: '#6B5744',
                                border: '1px solid #E6DDD5',
                                borderRadius: 4,
                                padding: '6px 14px',
                                textDecoration: 'none',
                                lineHeight: 1.5,
                                minHeight: 36,
                                display: 'inline-flex',
                                alignItems: 'center',
                                transition: 'background-color 150ms',
                            }}
                        >
                            {cat.title}
                        </a>
                    ))}
                </nav>

                {psychResources.map((cat, catIdx) => (
                    <section
                        key={cat.id}
                        id={cat.id}
                        aria-labelledby={`cat-heading-${cat.id}`}
                        style={{ marginBottom: 64 }}
                    >
                        {/* Category heading */}
                        <div style={{ marginBottom: 8 }}>
                            <h2
                                id={`cat-heading-${cat.id}`}
                                style={{
                                    fontFamily: "'Noto Serif SC', serif",
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: '#3D3028',
                                    marginBottom: 6,
                                }}
                            >
                                {cat.title}
                            </h2>
                            <p
                                style={{
                                    fontSize: 14,
                                    color: '#7A6558',
                                    lineHeight: 1.7,
                                    marginBottom: 20,
                                }}
                            >
                                {cat.description}
                            </p>
                            <div style={{ height: 1, backgroundColor: '#E6DDD5' }} />
                        </div>

                        {/* Resource grid / scroll row */}
                        <div
                            className={cat.resources.length > 3 ? 'resources-scroll' : undefined}
                            style={cat.resources.length > 3
                                ? { marginTop: 4 }
                                : {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    gap: 0,
                                    marginTop: 4,
                                }}
                        >
                            {cat.resources.map(res => (
                                <article
                                    key={res.title}
                                    className="resource-card"
                                    style={{
                                        borderLeft: '3px solid #E8A87C',
                                        borderBottom: '1px solid #E6DDD5',
                                        padding: '20px 16px 20px 20px',
                                        backgroundColor: 'transparent',
                                        transition: 'background-color 150ms',
                                        ...(cat.resources.length > 3 ? {
                                            flexShrink: 0,
                                            width: 280,
                                            borderRight: '1px solid #E6DDD5',
                                        } : {}),
                                    }}
                                >
                                    {/* Type badge */}
                                    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: typeColor[res.type] || '#B5A898',
                                                border: `1px solid ${typeColor[res.type] || '#B5A898'}`,
                                                borderRadius: 3,
                                                padding: '2px 8px',
                                                letterSpacing: '0.03em',
                                            }}
                                        >
                                            {typeLabel[res.type] || res.type}
                                        </span>
                                        {res.author && (
                                            <span style={{ fontSize: 11, color: '#A89080' }}>
                                                {res.author}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 600,
                                            color: '#3D3028',
                                            marginBottom: 8,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {res.title}
                                    </h3>

                                    {/* Description */}
                                    <p
                                        style={{
                                            fontSize: 13,
                                            color: '#6B5744',
                                            lineHeight: 1.75,
                                            marginBottom: 14,
                                        }}
                                    >
                                        {res.description}
                                    </p>

                                    {/* Tags */}
                                    {res.tags.length > 0 && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 6,
                                                marginBottom: 14,
                                            }}
                                        >
                                            {res.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    style={{
                                                        fontSize: 11,
                                                        color: '#8A7060',
                                                        border: '1px solid #E6DDD5',
                                                        borderRadius: 3,
                                                        padding: '2px 8px',
                                                    }}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Link */}
                                    {res.url && res.url !== '#' ? (
                                        <a
                                            href={res.url}
                                            {...(res.url.startsWith('http')
                                                ? { target: '_blank', rel: 'noopener noreferrer' }
                                                : {})}
                                            style={{
                                                fontSize: 13,
                                                color: '#E8A87C',
                                                textDecoration: 'none',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                            aria-label={`前往 ${res.title}`}
                                        >
                                            前往 →
                                        </a>
                                    ) : (
                                        <span style={{ fontSize: 12, color: '#B5A898' }}>即将上线</span>
                                    )}
                                </article>
                            ))}
                        </div>

                        {catIdx < psychResources.length - 1 && (
                            <div style={{ height: 1, backgroundColor: '#E6DDD5', marginTop: 40 }} />
                        )}
                    </section>
                ))}

                {/* Footer note */}
                <div
                    role="note"
                    style={{
                        marginTop: 48,
                        padding: '20px 24px',
                        backgroundColor: '#F5EDE6',
                        borderLeft: '3px solid #7CB9A8',
                        borderRadius: '0 4px 4px 0',
                    }}
                >
                    <p style={{ fontSize: 13, color: '#5A4A3E', lineHeight: 1.8, margin: 0 }}>
                        <strong style={{ fontWeight: 600 }}>如需紧急帮助</strong>，请拨打{' '}
                        <a href="tel:110" style={{ color: '#E8A87C', textDecoration: 'none', fontWeight: 600 }}>
                            110
                        </a>{' '}
                        （报警）或{' '}
                        <a href="tel:12338" style={{ color: '#7CB9A8', textDecoration: 'none', fontWeight: 600 }}>
                            12338
                        </a>{' '}
                        （妇女儿童权益保护热线），24小时全天候。
                    </p>
                </div>

            </main>
        </div>
    )
}

export default PsychResourcesPage
