import { ANALYSIS_CONSENT_VERSION } from '@/lib/privacy/analysis-consent'

async function send(payload: object) {
  const response = await fetch('/v1/analysis-consent', {
    method: 'POST', credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || '授权选择暂时无法保存，请重试')
  }
}
export const prepareAnalysisConsent = (granted: boolean, conversationId: string) => send({
  action: 'prepare', granted, version: ANALYSIS_CONSENT_VERSION,
  conversationId: conversationId === '-1' ? null : conversationId,
})
export const completeAnalysisConsent = () => send({ action: 'complete' })

interface AnalysisConsent {
  granted: boolean
  decidedAt: string | null
  version: string | null
}

export async function requestAnalysisConsent(signal: AbortSignal, withdraw = false): Promise<AnalysisConsent> {
  const response = await fetch('/v1/analysis-consent', {
    signal, credentials: 'same-origin', cache: 'no-store',
    ...(withdraw ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'withdraw' }) } : {}),
  })
  if (!response.ok) { throw new Error('暂时无法确认团队分析授权，请重试。') }
  const status = await response.json()
  if (typeof status?.granted !== 'boolean' || !(status.decidedAt === null || typeof status.decidedAt === 'string')
      || !(status.version === null || typeof status.version === 'string')) {
    throw new Error('团队分析授权状态无法确认，请刷新。')
  }
  return status
}
