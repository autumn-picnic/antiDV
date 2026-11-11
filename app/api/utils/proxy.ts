import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import type { NextRequest } from 'next/server'
import { BackendError, fetchBackend } from '@/lib/backend'
import { optionalActor } from '@/lib/auth/server'
import { AccessError } from '@/lib/auth/policy'

const cookieNames = new Set(['xiaoan_guest', 'xiaoan_current', 'xiaoan_session'])

function allowedMethods(path: string): string[] {
  if (path === '/v1/privacy/options' || path === '/v1/me/privacy') { return ['GET'] }
  if (/^\/v1\/me\/privacy\/(?:region|nickname|preferences)$/.test(path)) { return ['PATCH'] }
  if (/^\/v1\/conversations\/[a-zA-Z0-9_-]+\/policy$/.test(path)) { return ['GET', 'PATCH'] }
  if (/^\/v1\/conversations\/[a-zA-Z0-9_-]+\/memory$/.test(path)) { return ['GET'] }
  if (/^\/v1\/conversations\/[a-zA-Z0-9_-]+\/memory\/actions$/.test(path)) { return ['POST'] }
  if (path === '/v1/config/models') { return ['GET'] }
  if (path === '/v1/conversations') { return ['GET', 'POST'] }
  if (path === '/v1/me/claim-guest') { return ['POST'] }
  if (/^\/v1\/conversations\/(?:current|[a-zA-Z0-9_-]+)$/.test(path)) { return ['GET', 'DELETE'] }
  if (/^\/v1\/conversations\/[a-zA-Z0-9_-]+\/responses(?:\/stream)?$/.test(path)) { return ['POST'] }
  return []
}

/** Same-origin gateway. Cookie paths remain /v1; no user-hash identity translation. */
export async function proxyChatflow(request: NextRequest) {
  const path = request.nextUrl.pathname
  const allowed = allowedMethods(path)
  if (!allowed.length) { return Response.json({ detail: 'Not found' }, { status: 404 }) }
  if (!allowed.includes(request.method)) {
    return Response.json({ detail: 'Method not allowed' }, { status: 405, headers: { Allow: allowed.join(', ') } })
  }
  const headers = new Headers()
  const origin = request.headers.get('origin')
  if (request.method !== 'GET') {
    const expected = process.env.FRONTEND_ORIGIN || request.nextUrl.origin
    if (origin !== expected || request.headers.get('sec-fetch-site') === 'cross-site') {
      return Response.json({ detail: 'Origin not allowed' }, { status: 403 })
    }
  }
  // Preserve the browser Origin: the backend must explicitly allow the frontend domain.
  if (origin) { headers.set('Origin', origin) }
  for (const name of ['content-type', 'accept']) {
    const value = request.headers.get(name)
    if (value) { headers.set(name, value) }
  }
  // Azure appends the actual connecting IP on the right; earlier values can be forged.
  const contextSecret = process.env.FEEDBACK_CONTEXT_SECRET
  const captureContext = /\/responses(?:\/stream)?$/.test(path)
  if (captureContext && contextSecret) {
    const onVercel = process.env.VERCEL === '1'
    const onAzure = Boolean(process.env.CONTAINER_APP_NAME)
    const ip = (onVercel
      ? request.headers.get('x-vercel-forwarded-for')
      : onAzure ? request.headers.get('x-forwarded-for')?.split(',').at(-1) : '')?.trim() || ''
    if (isIP(ip)) {
      const context: Record<string, string> = { ip, source: onVercel ? 'vercel-ip-geolocation' : 'azure-ingress' }
      if (onVercel) {
        context.country = request.headers.get('x-vercel-ip-country') || ''
        context.region = request.headers.get('x-vercel-ip-country-region') || ''
        context.city = request.headers.get('x-vercel-ip-city') || ''
      } else {
        try {
          // Best effort only: timeout/failure must not prevent sending the user's message.
          const geo = await fetch(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`, {
            signal: AbortSignal.timeout(1200), cache: 'no-store', redirect: 'error',
          })
          if (geo.ok) {
            const data = await geo.json()
            if (data.ip === ip) {
              for (const key of ['country', 'region', 'city']) {
                if (typeof data[key] === 'string') { context[key] = data[key].slice(0, 200) }
              }
              context.source = 'geojs-ip-geolocation'
            }
          }
        } catch { /* Retain the IP even when geolocation is unavailable. */ }
      }
      const encoded = JSON.stringify(context)
      headers.set('x-xiaoan-feedback-context', encoded)
      headers.set('x-xiaoan-feedback-signature', createHmac('sha256', contextSecret).update(encoded).digest('hex'))
    }
  }
  const cookies = request.cookies.getAll().filter(cookie => cookieNames.has(cookie.name))
  if (cookies.length) { headers.set('Cookie', cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')) }
  try {
    const actor = await optionalActor()
    if ((path === '/v1/me/claim-guest' || path.startsWith('/v1/me/privacy')) && !actor) { throw new AccessError(401, '请先登录') }
    if (actor) { headers.set('Authorization', `Bearer ${actor.token}`) }
    // Signed-in chats use account identity; guests retain their own credentials.
    if (actor && path !== '/v1/me/claim-guest') { headers.delete('Cookie')
      const current = request.cookies.get('xiaoan_current')?.value
      if (current) { headers.set('Cookie', `xiaoan_current=${current}`) }
    }
    const response = await fetchBackend(`${path}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: ['POST', 'PATCH'].includes(request.method) ? await request.arrayBuffer() : undefined,
      signal: request.signal,
    })
    const responseHeaders = new Headers({
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
      'Content-Type': response.headers.get('content-type') || 'application/json',
    })
    // Node 22 Headers keeps multiple Set-Cookie lines separate (including Expires commas).
    for (const cookie of response.headers.getSetCookie()) {
      if (cookieNames.has(cookie.slice(0, cookie.indexOf('=')))) { responseHeaders.append('Set-Cookie', cookie) }
    }
    return new Response(response.body, { status: response.status, headers: responseHeaders })
  }
  catch (error) {
    return Response.json({ detail: error instanceof BackendError || error instanceof AccessError ? error.message : '聊天服务暂时不可用' }, {
      status: error instanceof BackendError || error instanceof AccessError ? error.status : 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
