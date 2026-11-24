const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { createHash } = require('node:crypto')
const { NextRequest } = require('next/server')
const ts = require('typescript')
let actor, calls, intent, rejectPrepare, rejectAccountSave, failWrite
const account = { userId: 'user_alice', sessionId: 'sess_1', role: 'user', token: 'jwt' }
const sample = () => ({ granted: true, version: '2026-11-24', guest_conversation_id: 'guest-c1', created_at: new Date('2026-11-24T08:00:00Z'), consumed_by: null })
function reset() { actor = null; calls = []; intent = sample(); rejectPrepare = false; rejectAccountSave = false; failWrite = false }
reset(); afterEach(reset)
const db = {
  async query(sql, values) {
    calls.push({ sql, values })
    if (sql.includes('INSERT INTO xiaoan_analysis_intents')) return { rows: rejectPrepare ? [] : [{ token_hash: values[0] }] }
    if (sql.includes('SELECT * FROM xiaoan_analysis_intents')) return { rows: intent ? [intent] : [] }
    if (sql.includes('INSERT INTO xiaoan_analysis_consent(')) return { rows: rejectAccountSave ? [] : [{ clerk_user_id: values[0] }] }
    if (failWrite && sql.includes('INSERT INTO xiaoan_conversation_analysis_consent')) throw new Error('database secret error')
    return { rows: [] }
  },
  async connect() { return { query: db.query, release() {} } },
}
const cache = new Map()
function load(file) {
  const filename = path.resolve(__dirname, '..', file)
  if (cache.has(filename)) return cache.get(filename).exports
  const mod = new Module(filename, module)
  cache.set(filename, mod)
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = mod.require.bind(mod)
  mod.require = name => {
    if (name === 'server-only') return {}
    if (name === './database') return { feedbackDatabase: () => db }
    if (name === '@/lib/auth/server') return {
      optionalActor: async () => actor,
      requireActor: async () => { if (!actor) throw new (load('lib/auth/policy.ts').AccessError)(401, '请先登录'); return actor },
    }
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`)
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), `${name}.ts`)))
    return original(name)
  }
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
  return mod.exports
}
const { POST } = load('app/v1/analysis-consent/route.ts')
const repo = load('lib/feedback/analysis-consent.ts')
const token = 'a'.repeat(64)
const hash = value => createHash('sha256').update(value).digest('hex')
const prepare = { action: 'prepare', granted: true, version: '2026-11-24', conversationId: 'guest-c1' }
function request(body, cookie = '', origin = 'https://site.example') {
  return new NextRequest('https://site.example/v1/analysis-consent', { method: 'POST', headers: { Origin: origin, Cookie: cookie }, body: JSON.stringify(body) })
}

test('checked and unchecked choices both produce a server-held intent before login', async () => {
  for (const granted of [false, true]) {
    calls = []
    const response = await POST(request({ ...prepare, granted }, 'xiaoan_guest=private-guest-token'))
    assert.equal(response.status, 200)
    const cookie = response.headers.getSetCookie()[0]
    assert.match(cookie, /xiaoan_analysis_intent=[a-f0-9]{64};/)
    assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Path=\/v1/); assert.match(cookie, /SameSite=lax/i)
    const rawToken = cookie.split(';')[0].split('=')[1]
    assert.deepEqual(calls[0].values, [hash(rawToken), granted, '2026-11-24', 'guest-c1', hash('private-guest-token')])
    assert.match(calls[0].sql, /c.user_id IS NULL AND c.guest_hash=\$5/)
    assert.match(calls[0].sql, /c.expires_at>extract/)
    assert(!calls.some(q => q.sql.includes('INSERT INTO xiaoan_analysis_consent(')))
  }
})
test('registration before the first conversation is supported', async () => {
  const response = await POST(request({ ...prepare, conversationId: null, granted: false }))
  assert.equal(response.status, 200)
  assert.equal(calls[0].values[3], null)
  assert.equal(calls[0].values[4], null)
})
test('forged/expired guest conversation is rejected and no cookie is issued', async () => {
  rejectPrepare = true
  const response = await POST(request(prepare, 'xiaoan_guest=other-guest'))
  assert.equal(response.status, 404)
  assert.equal(response.headers.getSetCookie().length, 0)
})
test('cross-site, malformed, outdated and identity-forging choices are rejected before DB', async () => {
  assert.equal((await POST(request(prepare, '', 'https://evil.example'))).status, 403)
  for (const payload of [null, [], {}, { ...prepare, granted: 'true' }, { ...prepare, version: 'old' }, { ...prepare, userId: 'user_bob' }, { ...prepare, conversationId: '../victim' }]) {
    assert.equal((await POST(request(payload))).status, 400)
  }
  assert.equal(calls.length, 0)
})
test('signed-in identity cannot silently create a fresh guest intent', async () => {
  actor = account
  assert.equal((await POST(request(prepare))).status, 409)
  assert.equal(calls.length, 0)
})
test('completion requires authenticated identity and never accepts client identity/grant fields', async () => {
  assert.equal((await POST(request({ action: 'complete' }, `xiaoan_analysis_intent=${token}`))).status, 401)
  actor = account
  assert.equal((await POST(request({ action: 'complete', granted: true }, `xiaoan_analysis_intent=${token}`))).status, 400)
  assert.equal(calls.length, 0)
})
test('login completion atomically binds the choice and only the selected guest conversation', async () => {
  actor = account
  const response = await POST(request({ action: 'complete' }, `xiaoan_analysis_intent=${token}`))
  assert.equal(response.status, 200)
  assert.match(calls[1].sql, /FOR UPDATE/)
  assert.deepEqual(calls[1].values, [hash(token)])
  const saved = calls.find(q => q.sql.includes('INSERT INTO xiaoan_analysis_consent('))
  assert.deepEqual(saved.values, ['user_alice', true, '2026-11-24', intent.created_at])
  const guest = calls.find(q => q.sql.includes('INSERT INTO xiaoan_conversation_analysis_consent'))
  assert.equal(guest.values[0], 'guest-c1')
  assert.match(guest.sql, /u.clerk_user_id=\$2 AND u.status='active'/)
  assert.equal(calls.at(-1).sql, 'COMMIT')
  assert.match(response.headers.getSetCookie()[0], /Max-Age=0/)
})
test('unchecked choice is persisted as false, never inferred from successful registration', async () => {
  intent.granted = false
  await repo.completeAnalysisConsent(account, token)
  assert.equal(calls.find(q => q.sql.includes('INSERT INTO xiaoan_analysis_consent(')).values[1], false)
  assert.equal(calls.find(q => q.sql.includes('INSERT INTO xiaoan_conversation_analysis_consent')).values[2], false)
})
test('absent intent allows login without granting analysis access or querying DB', async () => {
  actor = account
  assert.equal((await POST(request({ action: 'complete' }))).status, 200)
  assert.equal(calls.length, 0)
})
test('expired or unknown intent cannot grant access', async () => {
  intent = null
  await assert.rejects(repo.completeAnalysisConsent(account, token), e => e.status === 410)
  assert.equal(calls.at(-1).sql, 'ROLLBACK')
  assert(!calls.some(q => q.sql.includes('INSERT INTO')))
})
test('replay by the same account is idempotent; replay by another account is rejected', async () => {
  intent.consumed_by = account.userId
  await repo.completeAnalysisConsent(account, token)
  assert.equal(calls.at(-1).sql, 'COMMIT')
  assert(!calls.some(q => q.sql.includes('INSERT INTO')))
  calls = []
  await assert.rejects(repo.completeAnalysisConsent({ ...account, userId: 'user_bob' }, token), e => e.status === 403)
  assert.equal(calls.at(-1).sql, 'ROLLBACK')
})
test('older login attempt cannot overwrite a later decision or add guest access', async () => {
  rejectAccountSave = true
  await repo.completeAnalysisConsent(account, token)
  assert.match(calls.find(q => q.sql.includes('INSERT INTO xiaoan_analysis_consent(')).sql, /decided_at<=EXCLUDED.decided_at/)
  assert(!calls.some(q => q.sql.includes('INSERT INTO xiaoan_conversation_analysis_consent')))
})
test('DB failure rolls back both grants, keeps the intent for retry and hides internal errors', async () => {
  actor = account; failWrite = true
  const response = await POST(request({ action: 'complete' }, `xiaoan_analysis_intent=${token}`))
  assert.equal(response.status, 503)
  assert.equal(calls.at(-1).sql, 'ROLLBACK')
  assert.equal(response.headers.getSetCookie().length, 0)
  assert(!JSON.stringify(await response.json()).includes('secret'))
})
