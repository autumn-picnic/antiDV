const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { NextRequest } = require('next/server')
function load(relative, stubs = {}) {
  const filename = path.resolve(relative); const mod = new Module(filename, module)
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = mod.require.bind(mod)
  mod.require = name => name in stubs ? stubs[name] : name === 'server-only' ? {} : original(name)
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
  return mod.exports
}
const originalFetch = globalThis.fetch
const keys = ['CHAT_TITLE_API_KEY', 'CHAT_TITLE_API_BASE', 'CHAT_TITLE_MODEL', 'CHATFLOW_DATABASE_URL', 'FRONTEND_ORIGIN']
const originalEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]))
afterEach(() => {
  globalThis.fetch = originalFetch
  for (const key of keys) { if (originalEnv[key] === undefined) { delete process.env[key] } else { process.env[key] = originalEnv[key] } }
})
const model = load('lib/chat-title/model.ts')
function completion(title) { return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ title }) }] }] } }
test('model uses the configured small model, strict JSON, no response storage and a bounded request', async () => {
  process.env.CHAT_TITLE_API_KEY = 'test-secret'; delete process.env.CHAT_TITLE_MODEL; delete process.env.CHAT_TITLE_API_BASE
  globalThis.fetch = async (url, init) => {
    assert.equal(url.href, 'https://api.openai.com/v1/responses')
    const body = JSON.parse(init.body)
    assert.equal(body.model, 'gpt-5.4-mini'); assert.equal(body.store, false)
    assert.equal(body.text.format.strict, true); assert.equal(body.max_output_tokens, 128)
    assert.equal(init.redirect, 'error'); assert(init.signal)
    assert.equal(JSON.parse(body.input[0].content).first_message, '不想离开，但我很难受')
    return Response.json(completion('暂不离开时的困扰'))
  }
  assert.equal(await model.generateConversationTitle('不想离开，但我很难受'), '暂不离开时的困扰')
})
test('refusal, truncation, malformed JSON and unsafe titles fail closed', async () => {
  process.env.CHAT_TITLE_API_KEY = 'test-secret'
  for (const value of [
    { ...completion('标题'), status: 'incomplete' },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] },
    completion(''), completion('长'.repeat(25)), completion('电话13812345678'), completion('<script>'), completion('[PERSON_1]'),
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'not JSON' }] }] },
  ]) {
    globalThis.fetch = async () => Response.json(value)
    await assert.rejects(model.generateConversationTitle('输入'))
  }
})
test('missing key, unsafe endpoint, timeouts and provider errors propagate without exposing provider text', async () => {
  delete process.env.CHAT_TITLE_API_KEY
  globalThis.fetch = async () => { throw new Error('should not call') }
  await assert.rejects(model.generateConversationTitle('输入'), /not configured/)
  process.env.CHAT_TITLE_API_KEY = 'test-secret'; process.env.CHAT_TITLE_API_BASE = 'http://invalid.test/'
  await assert.rejects(model.generateConversationTitle('输入'), /Invalid title endpoint/)
  delete process.env.CHAT_TITLE_API_BASE
  globalThis.fetch = async () => new Response('sensitive provider details', { status: 429 })
  await assert.rejects(model.generateConversationTitle('输入'), /Title generation failed/)
  globalThis.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError') }
  await assert.rejects(model.generateConversationTitle('输入'), { name: 'TimeoutError' })
})
function repository(generate, options = {}) {
  let live = options.live !== false; let row = options.row || null
  const queries = []
  const db = { query: async (sql, args) => {
    queries.push({ sql, args })
    if (sql.startsWith('SELECT t.response_id')) { return { rows: live ? [{ response_id: 'r1', message: '[PERSON_1]问保护令怎么办' }] : [] } }
    if (sql.startsWith('SELECT title')) { return { rows: live && row ? [row] : [] } }
    if (sql.startsWith('INSERT')) {
      if (row || !live) { return { rows: [] } }
      row = { title: null, status: 'pending', lease: args[2] }; return { rows: [{ response_id: 'r1' }] }
    }
    if (sql.startsWith('UPDATE')) {
      if (!live || row?.lease !== args[2]) { return { rows: [] } }
      row = { ...row, title: args[3], status: args[4] }; return { rows: [row] }
    }
    throw new Error('Unexpected SQL')
  } }
  return { ...load('lib/chat-title/repository.ts', {
    '@/lib/feedback/database': { feedbackDatabase: () => db }, './model': { ...model, generateConversationTitle: generate },
  }), queries, expire: () => { live = false; row = null } }
}
test('concurrent requests share a database claim; completed titles are reused', async () => {
  let calls = 0; let resolve
  const gate = new Promise(r => { resolve = r })
  const store = repository(async message => { calls++; assert.equal(message, '[PERSON_1]问保护令怎么办'); await gate; return '了解保护令申请' })
  const first = store.conversationTitle('c1', 'r1', true)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal((await store.conversationTitle('c1', 'r1', true)).status, 'pending')
  resolve(); assert.equal((await first).title, '了解保护令申请')
  assert.equal((await store.conversationTitle('c1', 'r1', true)).title, '了解保护令申请')
  assert.equal(calls, 1)
  assert(!store.queries.some(q => /user_original|assistant_original/.test(q.sql)))
})
test('GET never generates; unavailable/ephemeral sources do not generate', async () => {
  let calls = 0
  const generate = async () => { calls++; return '标题' }
  assert.equal((await repository(generate).conversationTitle('c1', 'r1', false)).status, 'missing')
  assert.equal((await repository(generate, { live: false }).conversationTitle('c1', 'r1', true)).status, 'unavailable')
  assert.equal(calls, 0)
})
test('deletion or expiry during generation cannot restore a title', async () => {
  const store = repository(async () => { store.expire(); return '了解保护令申请' })
  assert.equal((await store.conversationTitle('c1', 'r1', true)).status, 'unavailable')
  const update = store.queries.find(q => q.sql.startsWith('UPDATE'))
  assert.match(update.sql, /r.expires_at>extract/); assert.match(update.sql, /p.mode<>'ephemeral'/)
})
test('failed generation is recorded as fallback without automatic paid retries', async () => {
  let calls = 0
  const store = repository(async () => { calls++; throw new Error('provider failure') })
  assert.equal((await store.conversationTitle('c1', 'r1', true)).status, 'fallback')
  assert.equal((await store.conversationTitle('c1', 'r1', true)).status, 'fallback')
  assert.equal(calls, 1)
})
const policy = load('lib/auth/policy.ts')
function handler(status = 200, view = { conversation_id: 'c1', turns: [{ response_id: 'r1', user: 'RAW DISPLAY MUST NOT REACH MODEL' }] }) {
  const calls = []
  const module = load('lib/chat-title/handler.ts', {
    '@/app/api/utils/proxy': { proxyChatflow: async request => { calls.push({ type: 'auth', request }); return Response.json(view, { status }) } },
    '@/lib/auth/policy': policy,
    './repository': { conversationTitle: async (...args) => { calls.push({ type: 'repository', args }); return { title: '了解保护令申请', status: 'complete' } } },
    './model': { titleModelConfigured: () => true },
  })
  return { run: module.handleConversationTitle, calls }
}
function request(method = 'POST', origin = 'https://title.test') {
  process.env.FRONTEND_ORIGIN = 'https://title.test'; process.env.CHATFLOW_DATABASE_URL = 'configured-test-db'
  return new NextRequest('https://title.test/v1/conversations/c1/title', {
    method, headers: { origin, cookie: 'xiaoan_guest=guest-token' },
    ...(method === 'POST' ? { body: JSON.stringify({ first_message: 'FORGED', conversation_id: 'other' }) } : {}),
  })
}
test('title handler authenticates through existing gateway and ignores caller supplied text', async () => {
  const { run, calls } = handler()
  assert.equal((await run(request())).status, 200)
  assert.equal(calls[0].request.method, 'GET')
  assert.equal(calls[0].request.nextUrl.pathname, '/v1/conversations/c1')
  assert.equal(calls[0].request.headers.get('cookie'), 'xiaoan_guest=guest-token')
  assert.deepEqual(calls[1].args, ['c1', 'r1', true])
})
test('unauthorized, cross-origin and mismatched source requests never reach repository', async () => {
  for (const status of [401, 403, 404]) {
    const { run, calls } = handler(status)
    assert.equal((await run(request())).status, status); assert(!calls.some(c => c.type === 'repository'))
  }
  const cross = handler(); assert.equal((await cross.run(request('POST', 'https://evil.test'))).status, 403); assert.equal(cross.calls.length, 0)
  const mismatch = handler(200, { conversation_id: 'other', turns: [] }); assert.equal((await mismatch.run(request())).status, 502)
})
test('history title GET requests only existing titles and responses are not cacheable', async () => {
  const { run, calls } = handler()
  const response = await run(request('GET'))
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(calls[1].args, ['c1', 'r1', false])
})
