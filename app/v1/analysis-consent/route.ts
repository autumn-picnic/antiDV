import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { optionalActor, requireActor } from '@/lib/auth/server'
import { AccessError, accessResponse, assertSameOrigin } from '@/lib/auth/policy'
import { analysisConsentStatus, completeAnalysisConsent, prepareAnalysisConsent, withdrawAnalysisConsent } from '@/lib/feedback/analysis-consent'
import { ANALYSIS_CONSENT_COOKIE, ANALYSIS_CONSENT_MAX_AGE, ANALYSIS_CONSENT_VERSION } from '@/lib/privacy/analysis-consent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await analysisConsentStatus(await requireActor()), { headers: { 'Cache-Control': 'no-store' } })
  }
  catch (error) { return accessResponse(error) }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const text = await request.text()
    if (text.length > 1024) { throw new AccessError(413, '请求内容过长') }
    let payload
    try { payload = JSON.parse(text) }
    catch { throw new AccessError(400, '授权选择格式无效') }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) { throw new AccessError(400, '授权选择格式无效') }
    if (payload.action === 'withdraw' && Object.keys(payload).length === 1) {
      return NextResponse.json(await withdrawAnalysisConsent(await requireActor()), { headers: { 'Cache-Control': 'no-store' } })
    }
    if (payload.action === 'complete' && Object.keys(payload).length === 1) {
      const actor = await requireActor()
      const token = request.cookies.get(ANALYSIS_CONSENT_COOKIE)?.value
      if (token) { await completeAnalysisConsent(actor, token) }
      const response = NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } })
      response.cookies.set(ANALYSIS_CONSENT_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/v1', maxAge: 0 })
      return response
    }
    if (payload.action !== 'prepare' || typeof payload.granted !== 'boolean'
      || payload.version !== ANALYSIS_CONSENT_VERSION
      || !(payload.conversationId === null || (typeof payload.conversationId === 'string' && /^[a-zA-Z0-9_-]{1,36}$/.test(payload.conversationId)))
      || Object.keys(payload).some(key => !['action', 'granted', 'version', 'conversationId'].includes(key))) {
      throw new AccessError(400, '授权选择格式无效，请刷新后重试')
    }
    if (await optionalActor()) { throw new AccessError(409, '当前已登录，请刷新页面') }
    const token = await prepareAnalysisConsent(payload.granted, payload.conversationId, request.cookies.get('xiaoan_guest')?.value)
    const response = NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set(ANALYSIS_CONSENT_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/v1', maxAge: ANALYSIS_CONSENT_MAX_AGE })
    return response
  }
  catch (error) { return accessResponse(error) }
}
