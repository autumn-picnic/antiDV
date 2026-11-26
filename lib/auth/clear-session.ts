import type { NextRequest } from 'next/server'
import { ANALYSIS_CONSENT_COOKIE } from '@/lib/privacy/analysis-consent'

/** Clear local credentials only. Never DELETE conversations or account records. */
export function clearedSessionResponse(request: NextRequest, revoked: boolean) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Clear-Site-Data': '"cookies", "storage", "cache"',
    'Content-Type': 'application/json',
  })
  const names = new Set([ANALYSIS_CONSENT_COOKIE, 'xiaoan_guest', 'xiaoan_current', 'xiaoan_session', 'xiaoan_deletion_receipt', 'session_id', 'feedback_auth', 'locale', '__session', '__client_uat', '__clerk_db_jwt'])
  for (const { name } of request.cookies.getAll()) {
    if (/^[!#$%&'*+.^_`|~\w-]+$/.test(name)) { names.add(name) }
  }
  // Explicit expiry also covers cookie paths not visible on this request.
  const configuredDomain = process.env.FRONTEND_COOKIE_DOMAIN
  const domains = ['']
  if (configuredDomain && /^[a-z0-9.-]+$/i.test(configuredDomain)) {
    const domain = configuredDomain.replace(/^\./, '')
    if (request.nextUrl.hostname === domain || request.nextUrl.hostname.endsWith(`.${domain}`)) { domains.push(`; Domain=${domain}`) }
  }
  for (const name of names) {
    for (const path of ['/', '/v1', '/feedback']) {
      for (const domain of domains) {
        headers.append('Set-Cookie', `${name}=; Path=${path}${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict${request.nextUrl.protocol === 'https:' ? '; Secure' : ''}`)
      }
    }
  }
  return new Response(JSON.stringify({ cleared: true, revoked }), { status: revoked ? 200 : 503, headers })
}
