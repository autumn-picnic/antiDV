import type { NextRequest } from 'next/server'
import { optionalActor, requireActor } from '@/lib/auth/server'
import { AccessError, accessResponse, assertSameOrigin } from '@/lib/auth/policy'
import { validateFailure } from '@/lib/feedback/failure-validation'
import { listFailures, saveFailure } from '@/lib/feedback/failure-repository'
import { pageOffset } from '@/lib/feedback/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const text = await request.text()
    if (text.length > 30000) { throw new AccessError(413, '失败记录过长') }
    let body: unknown
    try { body = JSON.parse(text) }
    catch { throw new AccessError(400, '失败记录格式无效') }
    const failure = validateFailure(body)
    const actor = await optionalActor()
    await saveFailure(actor, failure)
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  }
  catch (error) { return accessResponse(error) }
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(true)
    return Response.json(await listFailures(actor, pageOffset(request.nextUrl.searchParams.get('offset'))), { headers: { 'Cache-Control': 'no-store' } })
  }
  catch (error) { return accessResponse(error) }
}
