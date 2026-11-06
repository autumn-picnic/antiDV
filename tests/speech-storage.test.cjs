const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
function load(file, overrides = {}) {
  const filename = path.resolve(__dirname, '..', file)
  const mod = new Module(filename, module)
  mod.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name)
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
  return mod.exports
}
const policy = load('lib/auth/policy.ts')
const admin = { userId: 'admin', role: 'admin' }
const user = { userId: 'ordinary', role: 'user' }
function repository(rows = []) {
  const queries = []; let connected = 0
  const client = { async query(sql, values) { queries.push({ sql, values }); return { rows } }, release() {} }
  const repo = load('lib/feedback/speech-repository.ts', {
    'server-only': {}, '@/lib/auth/policy': policy,
    './database': { feedbackDatabase: () => ({ ...client, async connect() { connected++; return client } }) },
  })
  return { repo, queries, connections: () => connected }
}
test('recording persistence preserves exact uploaded bytes, server identity and SHA256', async () => {
  const h = repository()
  const bytes = new Uint8Array(32044).fill(17)
  const id = await h.repo.saveSpeechRecording(user, bytes)
  assert.match(id, /^[0-9a-f-]{36}$/)
  const q = h.queries[0]
  assert.match(q.sql, /VALUES \(\$1,\$2,\$3,\$4,\$5\)/)
  assert.equal(q.values[1], 'ordinary')
  assert.deepEqual(q.values[2], Buffer.from(bytes))
  assert.equal(q.values[3], require('node:crypto').createHash('sha256').update(bytes).digest('hex'))
  assert.equal(q.values[4], 1000)
})
test('recording list is admin only, excludes audio, paginates and writes audit atomically', async () => {
  const h = repository(Array.from({ length: 51 }, (_, i) => ({ id: String(i) })))
  await assert.rejects(h.repo.listSpeechRecordings(user, 0), /管理员/)
  assert.equal(h.connections(), 0)
  const page = await h.repo.listSpeechRecordings(admin, 50)
  assert.equal(page.items.length, 50); assert.equal(page.nextOffset, 100)
  assert.doesNotMatch(h.queries[1].sql, /SELECT\s+audio[,\s]/)
  assert.match(h.queries[2].sql, /xiaoan_speech_admin_access/)
  assert.deepEqual(h.queries[2].values, ['admin', 'list'])
  assert.equal(h.queries.at(-1).sql, 'COMMIT')
})
test('audio playback is admin only and audit stores recording id, without transcript/audio in audit', async () => {
  const audio = Buffer.from('original WAV')
  const h = repository([{ audio }])
  await assert.rejects(h.repo.readSpeechAudio(user, 'id'), /管理员/)
  assert.equal(h.connections(), 0)
  assert.deepEqual(await h.repo.readSpeechAudio(admin, 'id'), audio)
  assert.deepEqual(h.queries[2].values, ['admin', 'id', 'play'])
})
test('recording status and original transcript are persisted using parameters', async () => {
  const h = repository()
  await h.repo.completeSpeechRecording('id', 'success', "test' --", ['zh-CN'], null)
  assert.deepEqual(h.queries[0].values, ['id', 'success', "test' --", ['zh-CN'], null])
  assert.doesNotMatch(h.queries[0].sql, /test'/)
})
const id = 'ca3ae696-08ed-48b5-8e90-7c522b878095'
function playback(actor = admin, audio = Buffer.from('0123456789')) {
  let reads = 0
  const route = load('app/api/feedback/speech/[id]/route.ts', {
    '@/lib/auth/server': { requireActor: async wanted => { assert.equal(wanted, true); if (actor === null) { throw new policy.AccessError(401, '请先登录') } policy.assertAdmin(actor); return actor } },
    '@/lib/auth/policy': policy,
    '@/lib/feedback/speech-repository': { readSpeechAudio: async () => { reads++; return audio } },
  })
  return { get: (range, key = id) => route.GET(new Request(`https://xiaoan.test/api/feedback/speech/${key}`, { headers: range ? { Range: range } : {} }), { params: Promise.resolve({ id: key }) }), reads: () => reads }
}
test('audio HTTP endpoint fails closed for guests and ordinary users before database access', async () => {
  for (const [actor, status] of [[null, 401], [user, 403]]) {
    const h = playback(actor)
    assert.equal((await h.get()).status, status)
    assert.equal(h.reads(), 0)
  }
})
test('audio endpoint supports exact full bytes, range seeking, and rejects invalid ranges and ids', async () => {
  const h = playback()
  const full = await h.get()
  assert.equal(full.status, 200); assert.equal(await full.text(), '0123456789')
  assert.equal(full.headers.get('Cache-Control'), 'no-store')
  const partial = await h.get('bytes=2-5')
  assert.equal(partial.status, 206); assert.equal(await partial.text(), '2345')
  assert.equal(partial.headers.get('Content-Range'), 'bytes 2-5/10')
  assert.equal(await (await h.get('bytes=-3')).text(), '789')
  assert.equal((await h.get('bytes=99-100')).status, 416)
  assert.equal((await h.get('bytes=1-2,4-5')).status, 416)
  assert.equal((await h.get(null, '../private')).status, 400)
  assert.equal((await playback(admin, null).get()).status, 404)
})
