'use client'
import { useEffect, useState } from 'react'
import { completeAnalysisConsent } from '@/service/analysis-consent'

/** Finish the server-held choice after Clerk returns, including after a reload. */
export default function AnalysisConsentCompletion() {
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setError('')
    completeAnalysisConsent().catch((cause) => {
      if (active) { setError(cause instanceof Error ? cause.message : '授权选择暂时无法保存，请重试') }
    })
    return () => { active = false }
  }, [attempt])
  if (!error) { return null }
  return <div role='status' className='flex flex-wrap items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-900'>
    <span>{error}。你仍可继续聊天。</span>
    <button type='button' onClick={() => setAttempt(value => value + 1)} className='min-h-11 rounded px-2 underline focus-visible:outline focus-visible:outline-2'>重试保存选择</button>
  </div>
}
