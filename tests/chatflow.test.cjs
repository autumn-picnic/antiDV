const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

// Compile the actual TypeScript modules without adding a test runtime dependency.
// server-only is a bundler guard, bypassed only inside this isolated Node harness.
let mockActor = { userId: 'user_test', sessionId: 'sess_test', role: 'user', token: 'verified-token' }
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
    if (name === '@/lib/auth/server') return { optionalActor: async () => mockActor }
    return name === 'server-only' ? {} : name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : originalRequire(name)
  }
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  mod._compile(source, filename)
  return mod.exports
}
const api = load('service/index.ts')
const { fetchBackend } = load('lib/backend.ts')
const { proxyChatflow } = load('app/api/utils/proxy.ts')
const { NextRequest } = require('next/server')
const originalFetch = globalThis.fetch
const envKeys = ['BACKEND_API_URL', 'BACKEND_API_KEY', 'BACKEND_API_KEY_HEADER', 'FRONTEND_ORIGIN']
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]))
afterEach(() => {
  mockActor = { userId: 'user_test', sessionId: 'sess_test', role: 'user', token: 'verified-token' }
  globalThis.fetch = originalFetch
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})
function frame(event, data = {}, ids = {}) {
  return `event: ${event}\ndata: ${JSON.stringify({ conversation_id: 'c1', response_id: 'r1', ...ids, ...data })}\n\n`
}
const start = frame('start')
const done = frame('completed', { safety_level: 'unclear' })
function stream(text, size = 10000) {
  const bytes = new TextEncoder().encode(text)
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size))
    controller.close()
  } }), { headers: { 'Content-Type': 'text/event-stream' } })
}

test('SSE handles split UTF-8, CRLF, multi-line data, keepalive and ignores debug', async () => {
  let answer = ''
  const multi = 'event: delta\ndata: {"conversation_id":"c1",\ndata: "response_id":"r1","delta":"你好🌱"}\n\n'
  const text = (start + ': keepalive\n\n' + multi + frame('debug', { debug: { secret: 'not-visible' } }) + done).replaceAll('\n', '\r\n')
  const result = await api.readChatStream(stream(text, 1), 'c1', { onDelta: text => { answer += text } })
  assert.equal(answer, '你好🌱')
  assert.equal(result.safety_level, 'unclear')
})

test('SSE keeps debug separate from answer and associates it with completed response', async () => {
  let answer = ''
  const diagnostic = { output_guard: { status: 'allow', regenerated: false }, route: { capsule_id: 'baseline' } }
  const completed = await api.readChatStream(stream(start + frame('delta', { delta: '回答' }) + frame('debug', { debug: diagnostic }) + done), 'c1', { onDelta: delta => { answer += delta } })
  assert.equal(answer, '回答')
  assert.deepEqual(completed.debug, diagnostic)
})

test('SSE failure exposes only typed guard summary to the caller', async () => {
  const guard = { status: 'block', regenerated: false }
  await assert.rejects(api.readChatStream(stream(start + frame('error', { debug: { output_guard: guard, error: { secret: 'private' } } })), 'c1', { onDelta() {} }), error => {
    assert.deepEqual(error.guard, guard)
    assert.equal(error.message.includes('private'), false)
    return true
  })
})

test('SSE accepts multiple events per chunk; terminal prevents further text', async () => {
  let text = ''
  await api.readChatStream(stream(start + frame('delta', { delta: 'A' }) + done + frame('delta', { delta: 'ignored' })), 'c1', { onDelta: delta => { text += delta } })
  assert.equal(text, 'A')
})

test('EOF is not completed and includes response ID for reconciliation', async () => {
  await assert.rejects(api.readChatStream(stream(start + frame('delta', { delta: 'partial' })), 'c1', { onDelta() {} }), error => error.status === 0 && error.responseId === 'r1')
})

test('HTTP 200 SSE error rejects, never retries or accepts a later completion', async () => {
  globalThis.fetch = () => { throw new Error('must not retry') }
  await assert.rejects(api.readChatStream(stream(start + frame('error', { message: 'sensitive upstream details' }) + done), 'c1', { onDelta() {} }), error => error.status === 503 && !error.message.includes('sensitive'))
})

for (const [name, text] of [
  ['missing start', frame('delta', { delta: 'bad' }) + done],
  ['conversation mismatch', start + frame('delta', { delta: 'bad' }, { conversation_id: 'other' })],
  ['response mismatch', start + frame('delta', { delta: 'bad' }, { response_id: 'other' })],
  ['duplicate start', start + start],
  ['malformed JSON', start + 'event: delta\ndata: {oops}\n\n'],
  ['unknown safety level', start + frame('completed', { safety_level: 'unknown' })],
]) {
  test(`SSE rejects ${name}`, async () => {
    await assert.rejects(api.readChatStream(stream(text), 'c1', { onDelta() {} }))
  })
}

test('SSE idle timeout cancels the reader and fails', async () => {
  let cancelled = false
  const response = new Response(new ReadableStream({ cancel() { cancelled = true } }), { headers: { 'Content-Type': 'text/event-stream' } })
  await assert.rejects(api.readChatStream(response, 'c1', { onDelta() {} }, 5), /超时/)
  assert.equal(cancelled, true)
})

test('native send uses message/debug:false, Cookie credentials and no retry', async () => {
  let calls = 0
  globalThis.fetch = async (url, init) => {
    calls++
    assert.equal(url, '/v1/conversations/c1/responses/stream')
    assert.equal(init.credentials, 'include')
    assert.equal(init.cache, 'no-store')
    assert.deepEqual(JSON.parse(init.body), { message: '合成测试', debug: false })
    return stream(start + done)
  }
  await api.sendChatMessage('c1', '合成测试', { onDelta() {} }, new AbortController().signal)
  assert.equal(calls, 1)
})

test('debug mode explicitly requests diagnostics without retrying generation', async () => {
  let calls = 0
  globalThis.fetch = async (_url, init) => {
    calls++
    assert.deepEqual(JSON.parse(init.body), { message: '合成测试', debug: true })
    return stream(start + frame('debug', { debug: { output_guard: { status: 'allow', regenerated: false } } }) + done)
  }
  const result = await api.sendChatMessage('c1', '合成测试', { onDelta() {} }, new AbortController().signal, true)
  assert.equal(result.debug.output_guard.status, 'allow')
  assert.equal(calls, 1)
})

test('invalid message never starts a request', async () => {
  globalThis.fetch = () => { throw new Error('unexpected request') }
  await assert.rejects(api.sendChatMessage('c1', ' ', { onDelta() {} }, new AbortController().signal), error => error.status === 422)
  await assert.rejects(api.sendChatMessage('c1', '字'.repeat(4001), { onDelta() {} }, new AbortController().signal), error => error.status === 422)
})

test('current 404 returns empty; 503 remains a visible error', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 })
  assert.equal(await api.fetchCurrentConversation(), null)
  globalThis.fetch = async () => new Response('private error', { status: 503 })
  await assert.rejects(api.fetchCurrentConversation(), error => error.status === 503 && !error.message.includes('private'))
})

test('list follows next_offset and history follows next_after', async () => {
  globalThis.fetch = async url => {
    if (url.includes('offset=0')) return Response.json({ items: [{ id: 'c1' }], next_offset: 1 })
    if (url.includes('offset=1')) return Response.json({ items: [{ id: 'c2' }], next_offset: null })
    const after = url.includes('after=0') ? 0 : 1
    return Response.json({ conversation_id: 'c1', turns: [{ user: `q${after}`, assistant: `a${after}` }], next_after: after === 0 ? 1 : null })
  }
  assert.equal((await api.fetchConversations()).length, 2)
  assert.equal((await api.fetchConversation('c1')).turns.length, 2)
})

test('history retains per-turn debug metadata for restored chat', async () => {
  const debug = { output_guard: { status: 'allow', regenerated: false } }
  globalThis.fetch = async () => Response.json({ conversation_id: 'c1', turns: [{ user: '合成提问', assistant: '合成回复', debug }], next_after: null })
  const view = await api.fetchConversation('c1')
  assert.deepEqual(view.turns[0].debug, debug)
})

test('invalid pagination cursor fails rather than looping', async () => {
  globalThis.fetch = async () => Response.json({ items: [], next_offset: 0 })
  await assert.rejects(api.fetchConversations(), /分页/)
})

test('204 delete succeeds; failed delete rejects', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 })
  await api.deleteConversation('c1')
  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(api.deleteConversation('c1'), error => error.status === 503)
})

test('server config is required; there is no Dify fallback', async () => {
  delete process.env.BACKEND_API_URL
  globalThis.fetch = () => { throw new Error('unexpected request') }
  await assert.rejects(fetchBackend('/v1/conversations'), error => error.status === 503)
})

test('server transport uses a private key, disables cache and redirects', async () => {
  process.env.BACKEND_API_URL = 'https://backend.example'
  process.env.BACKEND_API_KEY = 'test-key'
  process.env.BACKEND_API_KEY_HEADER = 'api-key'
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://backend.example/v1/config/models')
    assert.equal(init.headers.get('api-key'), 'test-key')
    assert.equal(init.cache, 'no-store')
    assert.equal(init.redirect, 'error')
    return Response.json({})
  }
  await fetchBackend('/v1/config/models')
})

test('gateway preserves streaming, cookies, status and Origin; filters unrelated cookies', async () => {
  process.env.BACKEND_API_URL = 'https://backend.example'
  process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  delete process.env.BACKEND_API_KEY
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://backend.example/v1/conversations')
    assert.equal(init.headers.get('cookie'), 'xiaoan_current=c1')
    assert.equal(init.headers.get('authorization'), 'Bearer verified-token')
    assert.equal(init.headers.get('origin'), 'https://frontend.example')
    const response = Response.json({ conversation_id: 'c1' }, { status: 201 })
    response.headers.append('Set-Cookie', 'xiaoan_guest=guest; Path=/v1; HttpOnly; Secure; SameSite=Strict; Expires=Wed, 21 Oct 2026 07:28:00 GMT')
    response.headers.append('Set-Cookie', 'xiaoan_current=c1; Path=/v1; HttpOnly; Secure; SameSite=Strict')
    response.headers.append('Set-Cookie', 'unrelated=secret')
    return response
  }
  const response = await proxyChatflow(new NextRequest('https://frontend.example/v1/conversations', {
    method: 'POST', headers: { Origin: 'https://frontend.example', Cookie: 'xiaoan_guest=guest; xiaoan_current=c1; feedback_auth=secret' },
  }))
  assert.equal(response.status, 201)
  assert.equal(response.headers.getSetCookie().length, 2)
  assert.match(response.headers.getSetCookie()[0], /Expires=Wed, 21 Oct/)
  assert.equal(response.headers.get('cache-control'), 'no-store, no-transform')
})

test('gateway rejects cross-origin mutation, unknown routes and unsupported methods', async () => {
  process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  globalThis.fetch = () => { throw new Error('must not forward') }
  const cross = new NextRequest('https://frontend.example/v1/conversations', { method: 'POST', headers: { Origin: 'https://evil.example' } })
  assert.equal((await proxyChatflow(cross)).status, 403)
  assert.equal((await proxyChatflow(new NextRequest('https://frontend.example/v1/webhooks/clerk'))).status, 404)
  assert.equal((await proxyChatflow(new NextRequest('https://frontend.example/v1/config/models', { method: 'DELETE' }))).status, 405)
})

test('gateway forwards an SSE body without waiting for completion', async () => {
  process.env.BACKEND_API_URL = 'https://backend.example'
  process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(start)) } }), { headers: { 'Content-Type': 'text/event-stream' } })
  const response = await proxyChatflow(new NextRequest('https://frontend.example/v1/conversations/c1/responses/stream', {
    method: 'POST', headers: { Origin: 'https://frontend.example' }, body: JSON.stringify({ message: '合成测试' }),
  }))
  const reader = response.body.getReader()
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: start/)
  await reader.cancel()
})

test('guest gateway forwards only guest cookies without account authorization', async () => {
  mockActor = null
  process.env.BACKEND_API_URL = 'https://backend.example'
  delete process.env.BACKEND_API_KEY
  let forwarded = false
  globalThis.fetch = async (_, init) => {
    forwarded = true
    assert.equal(init.headers.get('authorization'), null)
    assert.equal(init.headers.get('cookie'), 'xiaoan_guest=guest; xiaoan_current=c1')
    return Response.json({ items: [] })
  }
  const response = await proxyChatflow(new NextRequest('https://frontend.example/v1/conversations', {
    headers: { Cookie: 'xiaoan_guest=guest; xiaoan_current=c1; __session=private; feedback_auth=secret' },
  }))
  assert.equal(response.status, 200)
  assert.equal(forwarded, true)
})

test('guest can create a conversation and receive its HttpOnly credential', async () => {
  mockActor = null
  process.env.BACKEND_API_URL = 'https://backend.example'
  delete process.env.BACKEND_API_KEY
  globalThis.fetch = async (_, init) => {
    assert.equal(init.headers.get('authorization'), null)
    return Response.json({ conversation_id: 'guest-c1' }, { status: 201, headers: { 'Set-Cookie': 'xiaoan_guest=opaque; Path=/v1; HttpOnly; SameSite=Strict' } })
  }
  const response = await proxyChatflow(new NextRequest('https://frontend.example/v1/conversations', { method: 'POST', headers: { Origin: 'https://frontend.example' } }))
  assert.equal(response.status, 201)
  assert.match(response.headers.getSetCookie()[0], /HttpOnly/)
})

test('guest cannot claim guest chats without an account', async () => {
  mockActor = null
  globalThis.fetch = () => { throw new Error('must not forward') }
  const response = await proxyChatflow(new NextRequest('https://frontend.example/v1/me/claim-guest', { method: 'POST', headers: { Origin: 'https://frontend.example' } }))
  assert.equal(response.status, 401)
})

test('private API key cannot overwrite Clerk authorization', async () => {
  process.env.BACKEND_API_URL = 'https://backend.example'
  process.env.BACKEND_API_KEY = 'private-key'
  process.env.BACKEND_API_KEY_HEADER = 'authorization'
  await assert.rejects(fetchBackend('/v1/conversations', { headers: { Authorization: 'Bearer clerk-token' } }), error => error.status === 503)
})

const privacy = load('service/privacy.ts')
const historyPolicy = { mode: 'history', retention_days: 30, expiry_basis: 'per_completed_turn', expires_at: 1900000000, policy_version: 2, idle_timeout_seconds: null }
const status = { available: true, fields: Object.fromEntries(['region', 'nickname', 'preferences'].map(field => [field, { allowed: false, version: 0, expires_at: null }])) }

test('privacy policy preserves server period and renders history, rolling and no-history notice', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/v1/conversations/c1/policy'); assert.equal(init.credentials, 'include'); assert.equal(init.cache, 'no-store')
    return Response.json(historyPolicy)
  }
  assert.deepEqual(await privacy.fetchConversationPolicy('c1'), historyPolicy)
  assert.match(privacy.retentionNotice(historyPolicy), /分别保留30天/)
  assert.match(privacy.retentionNotice({ ...historyPolicy, mode: 'rolling', retention_days: 60 }), /最后一轮成功回答起保留60天/)
  assert.match(privacy.retentionNotice({ ...historyPolicy, mode: 'ephemeral', retention_days: null }), /不保存.*24小时/)
  assert.match(privacy.retentionNotice(null), /正在确认/)
})
test('retention PATCH carries version and explicit history-save/delete/extension choices', async () => {
  const body = { policy_version: 2, mode: 'rolling', retention_days: 60, save_existing: false, delete_existing: false, extend_existing: true }
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/v1/conversations/c1/policy'); assert.equal(init.method, 'PATCH')
    assert.deepEqual(JSON.parse(init.body), body)
    return Response.json({ ...historyPolicy, mode: 'rolling', retention_days: 60, policy_version: 3 })
  }
  assert.equal((await privacy.changeConversationPolicy('c1', body)).retention_days, 60)
})
test('consent grant transmits only selected field and explicitly provided value', async () => {
  const body = { version: 0, allowed: true, value: { province_code: '440000', purpose: 'help' }, retention_days: 30, extend: false }
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/v1/me/privacy/region'); assert.equal(init.method, 'PATCH')
    assert.deepEqual(JSON.parse(init.body), body)
    return Response.json(status)
  }
  await privacy.changeConsent('region', body)
})
test('consent revoke and extension need no sensitive replacement values', async () => {
  let calls = 0
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body)
    assert.equal('value' in body, false); assert.equal(body.version, 3)
    assert.equal(body.allowed, calls === 1); assert.equal(body.extend, calls === 1)
    calls++; return Response.json(status)
  }
  await privacy.changeConsent('nickname', { version: 3, allowed: false, retention_days: 30, extend: false })
  await privacy.changeConsent('nickname', { version: 3, allowed: true, retention_days: 60, extend: true })
  assert.equal(calls, 2)
})
test('privacy pending 202 never becomes saved policy or completed deletion', async () => {
  globalThis.fetch = async () => Response.json({ status: 'privacy_change_pending' }, { status: 202 })
  await assert.rejects(privacy.changeConversationPolicy('c1', {}), error => error.status === 202 && /尚未确认完成/.test(error.message))
  await assert.rejects(privacy.changeConsent('region', {}), error => error.status === 202)
  await assert.rejects(api.deleteConversation('c1'), error => error.status === 202)
})
test('privacy conflicts request refresh and never leak upstream details', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'private database value' }, { status: 409 })
  await assert.rejects(privacy.fetchPrivacyStatus(), error => error.status === 409 && /刷新/.test(error.message) && !error.message.includes('private'))
})
test('malformed privacy policy/status rejected before enabling settings', async () => {
  globalThis.fetch = async () => Response.json({ ...historyPolicy, retention_days: 999 })
  await assert.rejects(privacy.fetchConversationPolicy('c1'), error => error.status === 502)
  globalThis.fetch = async () => Response.json({ available: true, fields: {} })
  await assert.rejects(privacy.fetchPrivacyStatus(), error => error.status === 502)
})
test('privacy options use server defaults and approved geographic codes', async () => {
  const options = { fields: ['region', 'nickname', 'preferences'], default_allowed: false, default_retention_days: 30, max_retention_days: 90, provinces: { '440000': '广东省' }, city_codes: ['440100'] }
  globalThis.fetch = async (url) => { assert.equal(url, '/v1/privacy/options'); return Response.json(options) }
  assert.deepEqual(await privacy.fetchPrivacyOptions(), options)
})
test('gateway forwards privacy PATCH body, authenticated identity and pending status', async () => {
  process.env.BACKEND_API_URL = 'https://backend.example'; process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  const body = { version: 0, allowed: false, retention_days: 30, extend: false }
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://backend.example/v1/me/privacy/region'); assert.equal(init.method, 'PATCH')
    assert.equal(init.headers.get('authorization'), 'Bearer verified-token')
    assert.deepEqual(JSON.parse(new TextDecoder().decode(init.body)), body)
    return Response.json({ status: 'privacy_change_pending' }, { status: 202 })
  }
  const result = await proxyChatflow(new NextRequest('https://frontend.example/v1/me/privacy/region', {
    method: 'PATCH', headers: { Origin: 'https://frontend.example', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))
  assert.equal(result.status, 202)
  assert.equal((await result.json()).status, 'privacy_change_pending')
})
test('guest gateway forwards retention changes with guest cookies', async () => {
  mockActor = null; process.env.BACKEND_API_URL = 'https://backend.example'; process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  globalThis.fetch = async (url, init) => {
    assert.equal(init.headers.get('cookie'), 'xiaoan_guest=guest-token'); assert.equal(init.headers.get('authorization'), null)
    return Response.json(historyPolicy)
  }
  const result = await proxyChatflow(new NextRequest('https://frontend.example/v1/conversations/c1/policy', {
    method: 'PATCH', headers: { Origin: 'https://frontend.example', Cookie: 'xiaoan_guest=guest-token' }, body: '{}',
  }))
  assert.equal(result.status, 200)
})
test('gateway rejects cross-origin, unsupported fields and methods for privacy mutations', async () => {
  process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  globalThis.fetch = () => { throw new Error('must not forward') }
  assert.equal((await proxyChatflow(new NextRequest('https://frontend.example/v1/me/privacy/region', { method: 'PATCH', headers: { Origin: 'https://evil.example' } }))).status, 403)
  assert.equal((await proxyChatflow(new NextRequest('https://frontend.example/v1/me/privacy/age', { method: 'PATCH', headers: { Origin: 'https://frontend.example' } }))).status, 404)
  assert.equal((await proxyChatflow(new NextRequest('https://frontend.example/v1/privacy/options', { method: 'PATCH', headers: { Origin: 'https://frontend.example' } }))).status, 405)
})

test('privacy gateway forwards versioned PATCH payload using account credentials', async () => {
  process.env.BACKEND_API_URL = 'https://backend.example'
  process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  const payload = { version: 2, allowed: false, retention_days: 30, extend: false }
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://backend.example/v1/me/privacy/nickname')
    assert.equal(init.method, 'PATCH')
    assert.equal(init.headers.get('authorization'), 'Bearer verified-token')
    assert.equal(init.headers.get('cookie'), null)
    assert.deepEqual(JSON.parse(Buffer.from(init.body).toString()), payload)
    return Response.json({ available: true })
  }
  const response = await proxyChatflow(new NextRequest('https://frontend.example/v1/me/privacy/nickname', {
    method: 'PATCH', headers: { Origin: 'https://frontend.example', 'Content-Type': 'application/json', Cookie: 'xiaoan_guest=guest' },
    body: JSON.stringify(payload),
  }))
  assert.equal(response.status, 200)
})

test('privacy gateway rejects unsigned personal consent and cross-origin policy changes', async () => {
  process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  globalThis.fetch = () => { throw new Error('must not forward') }
  mockActor = null
  assert.equal((await proxyChatflow(new NextRequest('https://frontend.example/v1/me/privacy'))).status, 401)
  const mutation = new NextRequest('https://frontend.example/v1/conversations/c1/policy', {
    method: 'PATCH', headers: { Origin: 'https://evil.example' }, body: '{}',
  })
  assert.equal((await proxyChatflow(mutation)).status, 403)
  assert.equal((await proxyChatflow(new NextRequest('https://frontend.example/v1/me/privacy/unknown', {
    method: 'PATCH', headers: { Origin: 'https://frontend.example' }, body: '{}',
  }))).status, 404)
})

test('guest conversation policy forwards its cookies and preserves pending or conflict status', async () => {
  process.env.BACKEND_API_URL = 'https://backend.example'
  process.env.FRONTEND_ORIGIN = 'https://frontend.example'
  mockActor = null
  for (const code of [202, 409]) {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), 'https://backend.example/v1/conversations/c1/policy')
      assert.equal(init.headers.get('cookie'), 'xiaoan_guest=guest; xiaoan_current=c1')
      assert.equal(init.headers.get('authorization'), null)
      return Response.json({ detail: 'pending or conflict' }, { status: code })
    }
    const response = await proxyChatflow(new NextRequest('https://frontend.example/v1/conversations/c1/policy', {
      method: 'PATCH', headers: { Origin: 'https://frontend.example', Cookie: 'xiaoan_guest=guest; xiaoan_current=c1; other=private' }, body: '{}',
    }))
    assert.equal(response.status, code)
  }
})

test('privacy client saves revocation payload and reports pending, conflict and invalid responses', async () => {
  const fields = Object.fromEntries(['region', 'nickname', 'preferences'].map(field => [field, { allowed: false, version: 3, expires_at: null }]))
  const change = { version: 2, allowed: false, retention_days: 30, extend: false }
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/v1/me/privacy/nickname')
    assert.equal(init.credentials, 'include')
    assert.equal(init.cache, 'no-store')
    assert.deepEqual(JSON.parse(init.body), change)
    return Response.json({ available: true, fields })
  }
  const result = await privacy.changeConsent('nickname', change)
  assert.equal(result.fields.nickname.allowed, false)
  for (const code of [202, 409]) {
    globalThis.fetch = async () => Response.json({}, { status: code })
    await assert.rejects(() => privacy.changeConsent('nickname', change), error => error instanceof api.ChatApiError && error.status === code)
  }
  globalThis.fetch = async () => Response.json({ available: true, fields: {} })
  await assert.rejects(() => privacy.fetchPrivacyStatus(), error => error.status === 502)
})

test('retention client keeps history, rolling and ephemeral expiry semantics distinct', async () => {
  for (const mode of ['history', 'rolling', 'ephemeral']) {
    const policy = { mode, retention_days: mode === 'ephemeral' ? null : 14, expires_at: null, policy_version: 2 }
    globalThis.fetch = async () => Response.json(policy)
    const result = await privacy.fetchConversationPolicy('c1')
    assert.equal(result.mode, mode)
    assert.match(privacy.retentionNotice(result), mode === 'ephemeral' ? /24小时/ : /14天/)
  }
  globalThis.fetch = async () => Response.json({ mode: 'history', retention_days: 100, expires_at: null, policy_version: 2 })
  await assert.rejects(() => privacy.fetchConversationPolicy('c1'), error => error.status === 502)
})
