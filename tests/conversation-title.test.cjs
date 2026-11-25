const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
function load(relative) {
  const file = path.resolve(__dirname, '..', relative)
  const mod = new Module(file, module)
  mod.filename = file
  mod.paths = Module._nodeModulePaths(path.dirname(file))
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, file)
  return mod.exports
}
const { summarizeConversationTitle: title } = load('utils/conversation-title.ts')
const { fetchConversationFirstMessage } = load('service/index.ts')
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
test('titles use the opening sentence and omit standalone greetings', () => {
  assert.equal(title('你好，我想了解怎么申请保护令？还有证据方面的问题。'), '我想了解怎么申请保护令？')
  assert.equal(title('我还没想离开，但我很难受'), '我还没想离开，但我很难受')
  assert.equal(title('我不想报警。可以聊聊吗？'), '我不想报警')
  assert.equal(title('你好像没理解我说的话'), '你好像没理解我说的话')
  assert.equal(title('我遇到的这些，算家暴吗？'), '我遇到的这些，算家暴吗？')
})
test('empty inputs and long unicode titles stay readable', () => {
  assert.equal(title('   '), '新对话')
  const result = title('🌱'.repeat(30))
  assert.equal(Array.from(result).length, 25)
  assert.equal(result, `${'🌱'.repeat(24)}…`)
})
test('common contact identifiers and markup are not copied into titles', () => {
  assert.equal(title('请联系13812345678'), '请联系[电话]')
  assert.equal(title('邮箱 me@example.com'), '邮箱 [邮箱]')
  assert.equal(title('证件110101199001010012'), '证件[证件号]')
  assert.equal(title('**如何收集证据**'), '如何收集证据')
})
test('history title read requests only one turn with credentials and cancellation', async () => {
  const abort = new AbortController()
  let requests = 0
  globalThis.fetch = async (url, init) => {
    requests++
    assert.equal(url, '/v1/conversations/c1?limit=1&after=0')
    assert.equal(init.credentials, 'include')
    assert.equal(init.cache, 'no-store')
    assert.equal(init.signal, abort.signal)
    return Response.json({ conversation_id: 'c1', turns: [{ user: '如何收集证据？' }], next_after: 1 })
  }
  assert.equal(await fetchConversationFirstMessage('c1', abort.signal), '如何收集证据？')
  assert.equal(requests, 1)
})
test('empty retained history is supported; mismatched and malformed responses are rejected', async () => {
  globalThis.fetch = async () => Response.json({ conversation_id: 'c1', turns: [] })
  assert.equal(await fetchConversationFirstMessage('c1'), '')
  for (const value of [{ conversation_id: 'other', turns: [] }, { conversation_id: 'c1', turns: [{ user: 7 }] }]) {
    globalThis.fetch = async () => Response.json(value)
    await assert.rejects(fetchConversationFirstMessage('c1'), { status: 502 })
  }
})
