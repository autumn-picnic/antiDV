import type { NextRequest } from 'next/server'
import { optionalActor } from '@/lib/auth/server'
import { assertGuestConversation, saveGuestReview, guestReviews } from '@/lib/feedback/guest-reviews'
import { AccessError, accessResponse, assertSameOrigin } from '@/lib/auth/policy'
import { ownReviews, saveReview } from '@/lib/feedback/repository'
import { validateId, validateReview } from '@/lib/feedback/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const actor = await optionalActor()
    const conversationId = validateId(request.nextUrl.searchParams.get('conversationId'))
    if (!actor) { await assertGuestConversation(request, conversationId) }
    const items = actor ? await ownReviews(actor, conversationId) : await guestReviews(conversationId)
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  }
  catch (error) { return accessResponse(error) }
}
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const actor = await optionalActor()
    const text = await request.text()
    if (text.length > 8000) { throw new AccessError(413, '评价内容过长') }
    let payload: unknown
    try { payload = JSON.parse(text) }
    catch { throw new AccessError(400, '评价格式无效') }
    const input = validateReview(payload)
    if (!actor) { await assertGuestConversation(request, input.conversationId) }
    const review = actor ? await saveReview(actor, input) : await saveGuestReview(input)
    return Response.json(review, { headers: { 'Cache-Control': 'no-store' } })
  }
  catch (error) { return accessResponse(error) }
}
