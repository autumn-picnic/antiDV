import 'server-only'
import { NextRequest } from 'next/server'
import { proxyChatflow } from '@/app/api/utils/proxy'
import { AccessError, assertSameOrigin } from '@/lib/auth/policy'
import { conversationTitle } from './repository'
import { titleModelConfigured } from './model'

const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
export async function handleConversationTitle(request: NextRequest) {
  if (!['GET', 'POST'].includes(request.method)) { return reply({ title: null }, 405) }
  try {
    if (request.method === 'POST') { assertSameOrigin(request) }
    const match = request.nextUrl.pathname.match(/^\/v1\/conversations\/([a-zA-Z0-9_-]{1,64})\/title$/)
    if (!match) { return reply({ title: null }, 404) }
    const id = match[1]
    // Use the existing gateway's live account / guest checks; ignore browser-supplied text.
    const url = new URL(`/v1/conversations/${id}?limit=1&after=0`, request.url)
    const authorized = await proxyChatflow(new NextRequest(url, { headers: request.headers, signal: request.signal }))
    if (!authorized.ok) { await authorized.body?.cancel(); return reply({ title: null }, authorized.status) }
    const view = await authorized.json()
    if (view.conversation_id !== id || !Array.isArray(view.turns)) { return reply({ title: null }, 502) }
    const responseId = view.turns[0]?.response_id
    if (typeof responseId !== 'string' || !responseId) { return reply({ title: null, status: 'unavailable' }) }
    if (!process.env.CHATFLOW_DATABASE_URL || (request.method === 'POST' && !titleModelConfigured())) {
      return reply({ title: null, status: 'disabled' })
    }
    return reply(await conversationTitle(id, responseId, request.method === 'POST'))
  }
  catch (error) {
    return reply({ title: null, status: 'unavailable' }, error instanceof AccessError ? error.status : 503)
  }
}
