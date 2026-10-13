import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: '管理员面板',
  robots: { index: false, follow: false },
}

export default function FeedbackLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
