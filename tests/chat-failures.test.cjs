const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

class ChatApiError extends Error {
  constructor(status, message, responseId, guard, code) {
    super(message)
    Object.assign(this, { status, responseId, guard, code })
  }
}

async function chatHarness({ createError, sendError, reportError, stop = false } = {}) {
  const states = []
  const effects = []
  const reports = []
  let stateIndex = 0
  let hook
  const react = {
    useState(initial) {
      const index = stateIndex++
      states[index] = initial
      return [initial, value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
    useRef: current => ({ current }),
    useEffect: callback => effects.push(callback),
  }
  const api = {
    ChatApiError,
    fetchConversations: async () => [],
    fetchCurrentConversation: async () => null,
    createConversation: async () => {
      if (createError) { throw createError }
      return { conversation_id: 'c1' }
    },
    sendChatMessage: async (_id, _message, callbacks) => {
      callbacks.onStart('r1')
      if (stop) { hook.stop() }
      if (sendError) { throw sendError }
      return { response_id: 'r1', safety_level: 'normal' }
    },
    saveChatFailure: async report => {
      reports.push(report)
      if (reportError) { throw reportError }
    },
  }
  const filename = path.resolve(__dirname, '../hooks/use-chatflow.ts')
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  mod.require = name => {
    if (name === 'react') { return react }
    if (name === '../service') { return api }
    if (name === '../utils/stream-renderer') { return { createStreamRenderer: () => ({ push() {}, cancel() {}, finish: async () => {} }) } }
    throw new Error(`Unexpected module: ${name}`)
  }
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
  hook = mod.exports.default({ authReady: true, signedIn: false, onCompleted() {} })
  for (const effect of effects) { effect() }
  await new Promise(resolve => setImmediate(resolve))
  return { hook, reports, failure: () => states.find(value => value && typeof value === 'object' && 'query' in value && 'message' in value) }
}

test('creation failure saves original input with no conversation or response', async () => {
  const harness = await chatHarness({ createError: new ChatApiError(503, '聊天服务不可用') })
  await harness.hook.send(' 原始失败输入 ')
  assert.equal(harness.reports.length, 1)
  const report = harness.reports[0]
  assert.equal(report.question, ' 原始失败输入 ')
  assert.equal(report.conversationId, null)
  assert.equal(report.responseId, null)
  assert.equal(report.stage, 'create_conversation')
  assert.match(report.reason, /聊天服务不可用.*503/)
})

test('generation failure records identifiers, safe backend code and guard summary', async () => {
  const harness = await chatHarness({ sendError: new ChatApiError(503, '回复未完成', 'r1', { status: 'block' }, 'service_unavailable') })
  await harness.hook.send('需要帮助')
  const report = harness.reports[0]
  assert.equal(report.conversationId, 'c1')
  assert.equal(report.responseId, 'r1')
  assert.equal(report.stage, 'generate_response')
  assert.equal(report.code, 'service_unavailable')
  assert.match(report.reason, /输出检查：block/)
  await harness.hook.send('需要帮助')
  assert.notEqual(harness.reports[1].id, report.id)
})

test('network failures save safe reason without exception secrets', async () => {
  const harness = await chatHarness({ createError: new Error('secret database URL') })
  await harness.hook.send('失败问题')
  assert.equal(harness.reports[0].status, 0)
  assert.equal(harness.reports[0].reason.includes('secret'), false)
})

test('success, local validation and intentional cancellation do not create failure reports', async () => {
  const success = await chatHarness()
  await success.hook.send('成功问题')
  await success.hook.send(' ')
  assert.equal(success.reports.length, 0)
  const cancelled = await chatHarness({ stop: true, sendError: new ChatApiError(0, '连接已中断') })
  await cancelled.hook.send('主动停止')
  assert.equal(cancelled.reports.length, 0)
})

test('report persistence failure is visible while preserving the original retry input', async () => {
  const harness = await chatHarness({ createError: new ChatApiError(503, '服务不可用'), reportError: new Error('DB offline') })
  await harness.hook.send('保留输入')
  await new Promise(resolve => setImmediate(resolve))
  assert.match(harness.failure().message, /失败记录暂未保存/)
  assert.equal(harness.failure().query, '保留输入')
})
