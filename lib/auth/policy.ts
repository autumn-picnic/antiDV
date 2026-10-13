export type Role = 'admin' | 'user'
export interface Actor { userId: string, sessionId: string, role: Role, token: string }

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function roleFromMetadata(metadata: Record<string, unknown>): Role {
  return metadata.role === 'admin' ? 'admin' : 'user'
}

export const FEEDBACK_ADMIN_EMAIL = 'autumnpicnic@proton.me'

export function isFeedbackAdminEmail(email: string | undefined, verified: boolean): boolean {
  return verified && email?.trim().toLowerCase() === FEEDBACK_ADMIN_EMAIL
}

export function assertAdmin(actor: Actor) {
  if (actor.role !== 'admin') { throw new AccessError(403, '仅管理员可以访问') }
}

export function assertSameOrigin(request: Request) {
  const expected = process.env.FRONTEND_ORIGIN || new URL(request.url).origin
  if (request.headers.get('origin') !== expected || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AccessError(403, '请求来源未获允许')
  }
}

export function accessResponse(error: unknown) {
  return Response.json({ message: error instanceof AccessError ? error.message : '服务暂时不可用，请稍后重试' }, {
    status: error instanceof AccessError ? error.status : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
