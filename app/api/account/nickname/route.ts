import { clerkClient } from '@clerk/nextjs/server'
import { AccessError, accessResponse, assertSameOrigin } from '@/lib/auth/policy'
import { requireActor } from '@/lib/auth/server'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const { userId } = await requireActor()
    const payload = await request.json().catch(() => null)
    const nickname = typeof payload?.nickname === 'string' ? payload.nickname.trim() : null
    if (nickname === null || nickname.length > 40) {
      throw new AccessError(400, '昵称最多 40 个字符')
    }
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(userId, { unsafeMetadata: { xiaoanNickname: nickname || null } })
    return new Response(null, { status: 204 })
  }
  catch (error) { return accessResponse(error) }
}
