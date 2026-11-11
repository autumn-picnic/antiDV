const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
const { NextRequest } = require('next/server')

function gateway() {
  const calls = []
  const mod = new Module(__filename, module)
  const original = mod.require.bind(mod)
  mod.require = name => {
    if (name === '@/lib/auth/server') { return { optionalActor: async () => ({ token: 'test-token' }) } }
    if (name === '@/lib/auth/policy') { return { AccessError: class extends Error {} } }
    if (name === '@/lib/backend') { return {
      BackendError: class extends Error {},
      fetchBackend: async (path, options) => { calls.push({ path, options }); return Response.json({ revision: 4, status: 'updated' }) },
    } }
    return original(name)
  }
  mod._compile(ts.transpileModule(fs.readFileSync('app/api/utils/proxy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, __filename)
  return { run: mod.exports.proxyChatflow, calls }
}
const url = 'https://memory.example/v1/conversations/conversation-1/memory'
test('memory reads forward authenticated identity without caching', async () => {
  const { run, calls } = gateway()
  const result = await run(new NextRequest(url))
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('cache-control'), 'no-store, no-transform')
  assert.equal(calls[0].path, '/v1/conversations/conversation-1/memory')
  assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer test-token')
})
test('memory changes preserve revision and record IDs', async () => {
  const { run, calls } = gateway()
  const origin = process.env.FRONTEND_ORIGIN || 'https://memory.example'
  const body = { revision: 3, action: 'delete_person', record_id: 'person-1' }
  const result = await run(new NextRequest(`${url}/actions`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
  assert.equal(result.status, 200)
  assert.deepEqual(JSON.parse(Buffer.from(calls[0].options.body).toString()), body)
})
test('memory mutations reject cross-origin requests before reaching backend', async () => {
  const { run, calls } = gateway()
  const result = await run(new NextRequest(`${url}/actions`, { method: 'POST', headers: { origin: 'https://other.example', 'sec-fetch-site': 'cross-site' }, body: '{}' }))
  assert.equal(result.status, 403)
  assert.equal(calls.length, 0)
})
test('memory routes allow only the contracted read and action methods', async () => {
  const { run, calls } = gateway()
  assert.equal((await run(new NextRequest(url, { method: 'DELETE' }))).status, 405)
  assert.equal((await run(new NextRequest(`${url}/actions`))).status, 405)
  assert.equal(calls.length, 0)
})
