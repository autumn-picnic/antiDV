import type { NextRequest } from 'next/server'
import { requireActor } from '@/lib/auth/server'
import { accessResponse } from '@/lib/auth/policy'
import { adminConversations } from '@/lib/feedback/repository'
import { pageOffset, validateId } from '@/lib/feedback/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(true)
    const params = request.nextUrl.searchParams
    const id = params.get('conversationId')
    const userId = params.get('userId')
    const view = id !== null
      ? { conversationId: validateId(id) }
      : params.get('view') === 'users'
        ? { users: true as const }
        : { userId: userId ? validateId(userId) : userId ?? undefined }
    const data = await adminConversations(actor, pageOffset(params.get('offset')), view)
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } })
  }
  catch (error) { return accessResponse(error) }
}
// The old client-supplied transcript write endpoint is intentionally retired.
