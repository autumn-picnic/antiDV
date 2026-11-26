import { createHmac, timingSafeEqual } from 'node:crypto'
import { feedbackDatabase } from '@/lib/feedback/database'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const secret = process.env.XIAOAN_ACCOUNT_CLEANUP_SECRET
  const signature = request.headers.get('x-xiaoan-cleanup-signature') || ''
  if (!secret || secret.length < 32 || !/^[a-f0-9]{64}$/.test(signature)) {
    return new Response(null, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const clerkUserId = body?.clerkUserId
  if (typeof clerkUserId !== 'string' || !/^user_[a-zA-Z0-9_-]{1,250}$/.test(clerkUserId)) {
    return new Response(null, { status: 400 })
  }
  const expected = createHmac('sha256', secret).update(`cleanup:${clerkUserId}`).digest()
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) {
    return new Response(null, { status: 401 })
  }
  try {
    await feedbackDatabase().query('SELECT public.xiaoan_cleanup_account($1)', [clerkUserId])
    return new Response(null, { status: 204 })
  }
  catch {
    return new Response(null, { status: 503 })
  }
}
