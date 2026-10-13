import 'server-only'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { AccessError, assertAdmin, isFeedbackAdminEmail, roleFromMetadata } from './policy'
import type { Actor } from './policy'

/** Check live session status and server-controlled metadata, including role revocation. */
export async function requireActor(admin = false): Promise<Actor> {
  const session = await auth()
  if (!session.userId || !session.sessionId) { throw new AccessError(401, '请先登录') }
  const clerk = await clerkClient()
  const live = await clerk.sessions.getSession(session.sessionId)
  if (live.status !== 'active' || live.userId !== session.userId) { throw new AccessError(401, '登录已失效，请重新登录') }
  const user = await clerk.users.getUser(session.userId)
  if (user.banned || user.locked) { throw new AccessError(403, '账号暂不可用') }
  const token = await session.getToken()
  if (!token) { throw new AccessError(401, '登录已失效，请重新登录') }
  const actor = { userId: session.userId, sessionId: session.sessionId, role: roleFromMetadata(user.publicMetadata), token }
  if (admin) {
    assertAdmin(actor)
    const email = user.emailAddresses.find(address => address.id === user.primaryEmailAddressId)
    if (!isFeedbackAdminEmail(email?.emailAddress, email?.verification?.status === 'verified')) {
      throw new AccessError(403, '仅指定管理员可以访问')
    }
  }
  return actor
}

/** Only an absent session is a guest; invalid or revoked sessions still fail closed. */
export async function optionalActor(): Promise<Actor | null> {
  const session = await auth()
  if (!session.userId && !session.sessionId) { return null }
  return requireActor()
}
