const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const XLSX = require('xlsx')
const filename = path.resolve(__dirname, '../app/components/feedback/export.ts')
const mod = new Module(filename, module)
mod.filename = filename
mod.paths = Module._nodeModulePaths(path.dirname(filename))
const originalRequire = mod.require.bind(mod)
let workbook, downloadName
mod.require = name => name === 'xlsx' ? { ...XLSX, writeFile: (book, name) => { workbook = book; downloadName = name } } : originalRequire(name)
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const { collectFeedbackExport, downloadFeedbackWorkbook, loadExportPage } = mod.exports
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch; workbook = null; downloadName = null })
const signal = () => new AbortController().signal

test('contact export loads every page, preserves field names and deduplicates IDs', async () => {
  const calls = []
  const a = { id: 'a', createdAt: '2026-10-21T00:00:00Z', message: '=1+1', name: null, phone: '00123', wechat: null, email: null }
  const tables = await collectFeedbackExport('contact', signal(), () => {}, async url => {
    calls.push(url)
    return url.endsWith('offset=0') ? { items: [a], nextOffset: 50 } : { items: [a, { ...a, id: 'b' }], nextOffset: null }
  })
  assert.deepEqual(calls, ['/api/contact?offset=0', '/api/contact?offset=50'])
  assert.deepEqual(tables[0].headers, ['id', 'createdAt', 'message', 'name', 'phone', 'wechat', 'email'])
  assert.equal(tables[0].rows.length, 2)
  await downloadFeedbackWorkbook(tables, 'contact', signal())
  const roundtrip = XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' })
  const sheet = roundtrip.Sheets['在线留言']
  assert.equal(sheet.C2.v, '=1+1')
  assert.equal(sheet.C2.t, 's')
  assert.equal(sheet.C2.f, undefined)
  assert.equal(sheet.E2.v, '00123')
  assert(downloadName.endsWith('.xlsx'))
})

test('chat export follows both conversation and turn pagination, keeps unreviewed answers blank', async () => {
  const calls = []
  const tables = await collectFeedbackExport('chat', signal(), () => {}, async url => {
    calls.push(url)
    if (url === '/api/feedback?offset=0') return { items: [{ id: 'c1', userId: null, createdAt: 0, turnCount: 2, reviewCount: 1 }], nextOffset: 50 }
    if (url === '/api/feedback?offset=50') return { items: [], nextOffset: null }
    const turn = { number: 1, responseId: 'r1', question: '问题', answer: '回答', score: 5, comment: '建议', reviewedAt: '2026-10-21T00:00:00Z' }
    return url.endsWith('offset=0') ? { items: [turn], nextOffset: 50 } : { items: [{ ...turn, responseId: 'r2', number: 2, score: null, comment: null, reviewedAt: null }], nextOffset: null }
  })
  assert.equal(calls.length, 4)
  assert.equal(tables[0].rows[0].创建时间, '1970-01-01T00:00:00.000Z')
  assert.equal(tables[1].rows.length, 2)
  assert.equal(tables[1].rows[1].评分, null)
  assert.equal(tables[1].rows[0].用户ID, '游客')
  await downloadFeedbackWorkbook(tables, 'chat', signal())
  assert.deepEqual(workbook.SheetNames, ['会话汇总', '聊天评价'])
})

test('invalid pagination, changed records and abort stop export without partial download', async () => {
  await assert.rejects(collectFeedbackExport('contact', signal(), () => {}, async () => ({ items: [], nextOffset: 0 })), /分页异常/)
  await assert.rejects(collectFeedbackExport('chat', signal(), () => {}, async url => ({ items: url.includes('conversationId') ? [] : [{ id: 'c1', turnCount: 1 }], nextOffset: null })), /发生变化/)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(collectFeedbackExport('contact', controller.signal, () => {}, async () => { throw new Error('should not request') }), { name: 'AbortError' })
  assert.equal(workbook, null)
})

test('permission denial and failed pages do not produce files', async () => {
  for (const status of [401, 403, 503]) {
    globalThis.fetch = async (_url, init) => { assert.equal(init.credentials, 'include'); assert.equal(init.cache, 'no-store'); return new Response(null, { status }) }
    await assert.rejects(loadExportPage('/api/contact?offset=0', signal()))
  }
  assert.equal(workbook, null)
})

test('empty exports retain headers and overlong text fails rather than truncating', async () => {
  const table = { name: '在线留言', headers: ['id', 'message'], widths: [38, 80], rows: [] }
  await downloadFeedbackWorkbook([table], 'contact', signal())
  assert.equal(workbook.Sheets['在线留言'].A1.v, 'id')
  workbook = null
  await assert.rejects(downloadFeedbackWorkbook([{ ...table, rows: [{ id: 'a', message: '字'.repeat(32768) }] }], 'contact', signal()), /单格上限/)
  assert.equal(workbook, null)
})
