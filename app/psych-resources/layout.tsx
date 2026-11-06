import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: '家暴防治教育资源',
    alternates: {
        canonical: 'https://anti-dv.vercel.app/psych-resources',
    },
    description:
        '家暴防治教育资源精选：创伤疗愈书籍、心理健康文章、安全规划指南、法律知识与权利意识，帮助你了解、理解并走出困境。',
    openGraph: {
        title: '家暴防治教育资源 — 小安反家暴助手',
        description:
            '创伤疗愈、安全规划、法律知识——家暴防治教育资源一站式汇总。',
        url: 'https://anti-dv.vercel.app/psych-resources',
    },
}

export default function PsychResourcesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
