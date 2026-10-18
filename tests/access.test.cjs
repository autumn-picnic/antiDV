const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { NextRequest } = require('next/server')
let authState, liveSession, user, token, queryRows, queryCalls, revoked, failClerk
function reset() {
  authState = { userId: 'user_alice', sessionId: 'sess_1', getToken: async () => token }
  liveSession = { status: 'active', userId: 'user_alice' }
  user = { publicMetadata: {}, banned: false, locked: false, primaryEmailAddressId: 'email_1', emailAddresses: [{ id: 'email_1', emailAddress: 'autumnpicnic@proton.me', verification: { status: 'verified' } }] }
  token = 'session-token'; queryRows = []; queryCalls = []; revoked = []; failClerk = false
}
reset()
const db = { query: async (sql, values) => { queryCalls.push({ sql, values }); return { rows: queryRows } }, connect: async () => ({ query: db.query, release() {} }) }
const clerk = {
  sessions: {
    getSession: async () => { if (failClerk) throw new Error('credential error'); return liveSession },
    revokeSession: async id => { revoked.push(id); return {} },
  },
  users: { getUser: async () => user },
}
const cache = new Map()
function load(file) {
  const filename = path.resolve(__dirname, '..', file)
  if (cache.has(filename)) return cache.get(filename).exports
  const mod = new Module(filename, module)
  cache.set(filename, mod)
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = mod.require.bind(mod)
  mod.require = name => {
    if (name === 'server-only') return {}
    if (name === '@clerk/nextjs/server') return { auth: async () => authState, clerkClient: async () => clerk }
    if (name === './database') return { feedbackDatabase: () => db }
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`)
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')))
    return originalRequire(name)
  }
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
  return mod.exports
}
const { requireActor, optionalActor } = load('lib/auth/server.ts')
const { roleFromMetadata, assertAdmin } = load('lib/auth/policy.ts')
const { validateReview } = load('lib/feedback/validation.ts')
const repository = load('lib/feedback/repository.ts')
const feedback = load('app/api/feedback/route.ts')
const reviews = load('app/api/reviews/route.ts')
const contact = load('app/api/contact/route.ts')
const clear = load('app/api/session/clear/route.ts')
const originalOrigin = process.env.FRONTEND_ORIGIN
afterEach(() => { reset(); if (originalOrigin === undefined) delete process.env.FRONTEND_ORIGIN; else process.env.FRONTEND_ORIGIN = originalOrigin })
const actor = { userId: 'user_alice', sessionId: 'sess_1', role: 'user', token: 'session-token' }
function req(url, init = {}) { return new NextRequest(`https://site.example${url}`, init) }

test('role is user by default; only exact server metadata admin grants access', () => {
  for (const role of [undefined, 'Admin', true, 'org:admin', 'user']) assert.equal(roleFromMetadata({ role }), 'user')
  assert.equal(roleFromMetadata({ role: 'admin' }), 'admin')
  assert.throws(() => assertAdmin(actor), e => e.status === 403)
})
test('signed-out user has no actor', async () => {
  authState = { userId: null, sessionId: null }
  await assert.rejects(requireActor(), e => e.status === 401)
})
test('revoked session denied even if JWT still has user and session IDs', async () => {
  liveSession.status = 'revoked'
  await assert.rejects(requireActor(), e => e.status === 401)
})
test('session ownership mismatch and banned account denied', async () => {
  liveSession.userId = 'user_bob'
  await assert.rejects(requireActor(), e => e.status === 401)
  liveSession.userId = 'user_alice'; user.banned = true
  await assert.rejects(requireActor(), e => e.status === 403)
})
test('admin role checked live; demotion applies to next request', async () => {
  user.publicMetadata.role = 'admin'
  assert.equal((await requireActor(true)).role, 'admin')
  user.publicMetadata.role = 'user'
  await assert.rejects(requireActor(true), e => e.status === 403)
})
test('regular user cannot read admin feedback API; DB is not touched', async () => {
  const response = await feedback.GET(req('/api/feedback'))
  assert.equal(response.status, 403); assert.equal(queryCalls.length, 0)
})
test('anonymous admin API request returns 401, not data', async () => {
  authState = { userId: null, sessionId: null }
  const response = await feedback.GET(req('/api/feedback'))
  assert.equal(response.status, 401); assert.equal(queryCalls.length, 0)
})
test('admin list reads conversations and commits an audit entry', async () => {
  user.publicMetadata.role = 'admin'
  queryRows = [{ id: 'c1' }]
  const response = await feedback.GET(req('/api/feedback'))
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).items, [{ id: 'c1' }])
  assert(queryCalls.some(q => q.sql.includes('xiaoan_admin_access') && q.values[0] === 'user_alice'))
  assert.equal(queryCalls.at(-1).sql, 'COMMIT')
})
test('review rejects forged user/transcript/role, invalid score and long comment', () => {
  const valid = { conversationId: 'c1', responseId: 'r1', score: 4, comment: '更具体一些' }
  assert.equal(validateReview(valid).score, 4)
  for (const data of [{ ...valid, userId: 'other' }, { ...valid, chatList: [] }, { ...valid, role: 'admin' }, { ...valid, score: 0 }, { ...valid, score: 6 }, { ...valid, score: 1.5 }, { ...valid, comment: 'a'.repeat(501) }]) assert.throws(() => validateReview(data), e => e.status === 400)
})
test('review ownership and completed answer checked in same parameterized write', async () => {
  queryRows = [{ responseId: 'r1', score: 4, comment: 'test' }]
  await repository.saveReview(actor, { conversationId: 'c1', responseId: 'r1', score: 4, comment: "'quoted'" })
  const query = queryCalls[0]
  assert.match(query.sql, /account_turns/)
  assert.match(query.sql, /u.clerk_user_id=\$3 AND u.status='active'/)
  assert.deepEqual(query.values, ['c1', 'r1', 'user_alice', 4, "'quoted'"])
  queryRows = []
  await assert.rejects(repository.saveReview(actor, { conversationId: 'other', responseId: 'r1', score: 5, comment: '' }), e => e.status === 404)
})
test('regular user can submit through reviews, not old transcript API', async () => {
  process.env.FRONTEND_ORIGIN = 'https://site.example'
  queryRows = [{ responseId: 'r1', score: 4, comment: '' }]
  const response = await reviews.POST(req('/api/reviews', { method: 'POST', headers: { Origin: 'https://site.example' }, body: JSON.stringify({ conversationId: 'c1', responseId: 'r1', score: 4, comment: '' }) }))
  assert.equal(response.status, 200)
  assert.equal(feedback.POST, undefined)
})
test('cross-origin review rejected before auth/DB', async () => {
  const response = await reviews.POST(req('/api/reviews', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' }))
  assert.equal(response.status, 403); assert.equal(queryCalls.length, 0)
})
test('Clerk outage fails closed without leaking provider errors', async () => {
  failClerk = true
  const response = await feedback.GET(req('/api/feedback'))
  assert.equal(response.status, 503)
  assert(!JSON.stringify(await response.json()).includes('credential'))
  assert.equal(queryCalls.length, 0)
})
test('logout revokes only session, expires cookies and never deletes history', async () => {
  process.env.FRONTEND_ORIGIN = 'https://site.example'
  const response = await clear.POST(req('/api/session/clear', { method: 'POST', headers: { Origin: 'https://site.example', Cookie: '__session=jwt; custom=value' } }))
  assert.equal(response.status, 200)
  assert.deepEqual(revoked, ['sess_1'])
  assert.equal(queryCalls.length, 0)
  const cookies = response.headers.getSetCookie()
  for (const [name, cookiePath] of [['__session', '/'], ['xiaoan_guest', '/v1'], ['xiaoan_current', '/v1'], ['feedback_auth', '/feedback'], ['custom', '/']]) {
    assert(cookies.some(c => c.startsWith(name + '=;') && c.includes(`Path=${cookiePath};`) && c.includes('Max-Age=0')))
  }
  assert.match(response.headers.get('Clear-Site-Data'), /cookies/)
})
test('logout still expires cookies on Clerk failure but does not claim success', async () => {
  failClerk = true
  const response = await clear.POST(req('/api/session/clear', { method: 'POST', headers: { Origin: 'https://site.example' } }))
  assert.equal(response.status, 503)
  assert.equal((await response.json()).revoked, false)
  assert(response.headers.getSetCookie().length > 0)
  assert.equal(queryCalls.length, 0)
})
test('cross-origin logout is rejected and cannot clear credentials', async () => {
  const response = await clear.POST(req('/api/session/clear', { method: 'POST', headers: { Origin: 'https://evil.example' } }))
  assert.equal(response.status, 403)
  assert.equal(response.headers.getSetCookie().length, 0)
  assert.equal(revoked.length, 0)
})

test('optional actor permits absent sessions but denies revoked and partial sessions', async () => {
  assert.equal((await optionalActor()).userId, 'user_alice')
  authState = { userId: null, sessionId: null }
  assert.equal(await optionalActor(), null)
  authState = { userId: 'user_alice', sessionId: null }
  await assert.rejects(optionalActor(), e => e.status === 401)
  reset()
  liveSession.status = 'revoked'
  await assert.rejects(optionalActor(), e => e.status === 401)
})

test('admin feedback requires designated verified primary email even with admin metadata', async () => {
  user.publicMetadata.role = 'admin'
  for (const email of ['other@example.com', 'autumnpicnic@proton.me.attacker.example']) {
    user.emailAddresses[0].emailAddress = email
    assert.equal((await feedback.GET(req('/api/feedback'))).status, 403)
    assert.equal(queryCalls.length, 0)
  }
  user.emailAddresses[0].emailAddress = 'autumnpicnic@proton.me'
  user.emailAddresses[0].verification.status = 'unverified'
  await assert.rejects(requireActor(true), e => e.status === 403)
  user.emailAddresses[0].verification.status = 'verified'
  user.primaryEmailAddressId = 'other_email'
  await assert.rejects(requireActor(true), e => e.status === 403)
  user.primaryEmailAddressId = 'email_1'
  user.emailAddresses[0].emailAddress = 'AUTUMNPICNIC@PROTON.ME'
  assert.equal((await requireActor(true)).role, 'admin')
})

test('contact submissions are anonymous, parameterized and preserve the requested field names', async () => {
  authState = { userId: null, sessionId: null }
  queryRows = [{ id: 'contact-1' }]
  const response = await contact.POST(req('/api/contact', { method: 'POST', headers: { Origin: 'https://site.example' }, body: JSON.stringify({ message: "  用户的 '留言'  ", name: '  姓名  ', phone: '', wechat: '', email: '' }) }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true, id: 'contact-1' })
  assert.match(queryCalls[0].sql, /"createdAt"/)
  assert.deepEqual(queryCalls[0].values.slice(1), ["用户的 '留言'", '姓名', null, null, null])
  assert(!queryCalls[0].sql.includes("用户的 '留言'"))
})

test('contact rejects invalid payloads and cross-origin writes before touching the database', async () => {
  for (const body of ['null', '{', '[]', JSON.stringify({ message: '' }), JSON.stringify({ message: 'x'.repeat(2001) }), JSON.stringify({ message: 'ok', phone: 123 }), JSON.stringify({ message: 'ok', email: 'x'.repeat(101) }), JSON.stringify({ message: 'ok', id: 'forged' })]) {
    assert.equal((await contact.POST(req('/api/contact', { method: 'POST', headers: { Origin: 'https://site.example' }, body }))).status, 400)
  }
  assert.equal((await contact.POST(req('/api/contact', { method: 'POST', headers: { Origin: 'https://other.example' }, body: '{}' }))).status, 403)
  assert.equal(queryCalls.length, 0)
})

test('contact reads require the designated verified primary admin; legacy secrets cannot bypass Clerk', async () => {
  authState = { userId: null, sessionId: null }
  assert.equal((await contact.GET(req('/api/contact?secret=xiao-an-admin'))).status, 401)
  reset()
  assert.equal((await contact.GET(req('/api/contact'))).status, 403)
  user.publicMetadata.role = 'admin'
  user.emailAddresses[0].emailAddress = 'other@example.com'
  assert.equal((await contact.GET(req('/api/contact'))).status, 403)
  user.emailAddresses[0].emailAddress = 'autumnpicnic@proton.me'
  user.emailAddresses[0].verification.status = 'unverified'
  assert.equal((await contact.GET(req('/api/contact'))).status, 403)
  user.emailAddresses[0].verification.status = 'verified'
  user.primaryEmailAddressId = 'other'
  assert.equal((await contact.GET(req('/api/contact'))).status, 403)
  assert.equal(queryCalls.length, 0)
})

test('contact reads paginate and commit an administrator access audit', async () => {
  user.publicMetadata.role = 'admin'
  queryRows = Array.from({ length: 51 }, (_, i) => ({ id: `contact-${i}`, createdAt: '2026-10-18T00:00:00Z', message: 'test', name: null, phone: null, wechat: null, email: null }))
  const response = await contact.GET(req('/api/contact?offset=50'))
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.items.length, 50)
  assert.equal(data.nextOffset, 100)
  assert(queryCalls.some(q => q.sql.includes('LIMIT 51 OFFSET $1') && q.values[0] === 50))
  assert(queryCalls.some(q => q.sql.includes('INSERT INTO xiaoan_contact_admin_access') && q.values[0] === 'user_alice'))
  assert.equal(queryCalls.at(-1).sql, 'COMMIT')
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
})

test('contact Clerk outage fails closed before database reads', async () => {
  user.publicMetadata.role = 'admin'
  failClerk = true
  assert.equal((await contact.GET(req('/api/contact'))).status, 503)
  assert.equal(queryCalls.length, 0)
})
