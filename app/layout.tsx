import { ClerkProvider } from '@clerk/nextjs'
import { zhCN } from '@clerk/localizations'
import type { Metadata } from 'next'
import { getLocaleOnServer } from '@/i18n/server'

import './styles/globals.css'
import './styles/markdown.scss'
import QuickExit from '@/app/components/quick-exit'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  metadataBase: new URL('https://anti-dv.vercel.app'),
  alternates: {
    canonical: 'https://anti-dv.vercel.app',
  },
  title: {
    default: '小安 — 反家暴AI支持助手',
    template: '%s — 小安',
  },
  description:
    '小安是专注于反家庭暴力的AI支持助手，提供安全、保密的情感支持，以及庇护所、法律援助、心理咨询等资源，24小时在线陪伴你。',
  openGraph: {
    siteName: '小安反家暴助手',
    locale: 'zh_CN',
    type: 'website',
    url: 'https://anti-dv.vercel.app',
    title: '小安 — 反家暴AI支持助手',
    description:
      '小安是专注于反家庭暴力的AI支持助手，提供安全、保密的情感支持，以及庇护所、法律援助、心理咨询等资源。',
  },
  twitter: {
    card: 'summary',
    title: '小安 — 反家暴AI支持助手',
    description: '安全 · 保密 · 随时在线。专注于反家庭暴力的AI支持助手。',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  'name': '小安反家暴助手',
  'url': 'https://anti-dv.vercel.app',
  'description':
    '专注于反家庭暴力的AI支持助手，提供情感支持、法律知识和紧急资源',
  'inLanguage': 'zh-Hans',
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': '小安反家暴助手',
  'url': 'https://anti-dv.vercel.app',
  'description': '专注于反家庭暴力的AI支持助手',
  'contactPoint': {
    '@type': 'ContactPoint',
    'contactType': 'crisis support',
    'availableLanguage': 'zh-Hans',
  },
}

const LocaleLayout = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = await getLocaleOnServer()
  return (
    <ClerkProvider localization={zhCN}>
      <html lang={locale ?? 'zh-Hans'} className="h-full">
        <head>
          {/* Preconnect to Google Fonts to reduce DNS + TLS latency */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* Non-blocking stylesheet (no @import means no render-blocking) */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />
        </head>
        <body className="h-full" style={{ backgroundColor: '#FBF8F4' }}>
          <QuickExit />
          <div className="overflow-x-hidden w-full">
            <div className="w-full h-screen">
              {children}
              <Analytics />
              <SpeedInsights />
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}

export default LocaleLayout
