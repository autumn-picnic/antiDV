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
