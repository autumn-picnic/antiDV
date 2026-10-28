const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const tick = () => new Promise(resolve => setImmediate(resolve))

// Exercise the real hook across renders, with controllable network and paint delays.
async function harness({ delayedCreate = false, delayedPaint = false } = {}) {
  const slots = []; const effects = []; const requests = []; const renderers = []; const reports = []
  let cursor = 0; let first = true; let completed = 0
  const react = {
    useState(initial) {
      const index = cursor++
      if (first) { slots[index] = initial }
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useRef(initial) {
      const index = cursor++
      if (first) { slots[index] = { current: initial } }
      return slots[index]
    },
    useEffect(callback) { if (first) { effects.push(callback) } },
  }
  const creation = deferred()
  const api = {
    ChatApiError: class extends Error {},
    fetchConversations: async () => [],
    fetchCurrentConversation: async () => null,
    createConversation: async () => delayedCreate ? creation.promise : { conversation_id: 'c1' },
    sendChatMessage(id, message, callbacks, signal) {
      const request = { ...deferred(), id, message, callbacks, signal }
      requests.push(request)
      callbacks.onStart(`r${requests.length}`)
      return request.promise
    },
    saveChatFailure: async report => { reports.push(report) },
  }
  const filename = path.resolve(__dirname, '../hooks/use-chatflow.ts')
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.require = name => {
    if (name === 'react') { return react }
    if (name === '../service') { return api }
    if (name === '../utils/stream-renderer') { return { createStreamRenderer(append) {
      const paint = deferred()
      const renderer = { cancelled: false, finishing: false,
        push: append,
        finish() { renderer.finishing = true; return delayedPaint ? paint.promise : Promise.resolve() },
        cancel() { renderer.cancelled = true; paint.resolve() },
      }
      renderers.push(renderer)
      return renderer
    } } }
    throw new Error(`Unexpected module: ${name}`)
  }
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
  function render() {
    cursor = 0
    const result = mod.exports.default({ authReady: true, signedIn: false, onCompleted() { completed++ } })
    first = false
    return result
  }
  render()
  for (const effect of effects) { effect() }
  await tick()
  return { render, requests, renderers, reports, creation, completions: () => completed }
}

for (const settlement of ['resolve', 'reject']) {
  test(`stop unlocks immediately; late ${settlement} cannot overwrite or unlock the next send`, async () => {
    const h = await harness()
    const oldSend = h.render().send('原问题')
    await tick()
    h.requests[0].callbacks.onDelta('未完成片段')
    h.render().stop()
    let state = h.render()
    assert.equal(state.busy, false)
    assert.equal(state.isResponding, false)
    assert.equal(state.failure, null)
    assert.deepEqual(state.chatList, [])
    assert.equal(h.requests[0].signal.aborted, true)
    assert.equal(h.renderers[0].cancelled, true)

    const nextSend = state.send('修改后的问题')
    await tick()
    assert.equal(h.requests[1].id, 'c1')
    h.requests[1].callbacks.onDelta('新回答')
    h.requests[0].callbacks.onDelta('迟到片段')
    if (settlement === 'resolve') { h.requests[0].resolve({ response_id: 'old', safety_level: 'immediate_danger' }) }
    else { h.requests[0].reject(new Error('aborted')) }
    await oldSend
    state = h.render()
    assert.equal(state.busy, true)
    assert.equal(state.isResponding, true)
    assert.equal(state.failure, null)
    assert.deepEqual(state.chatList.map(item => item.content), ['修改后的问题', '新回答'])
    assert.equal(h.renderers[1].cancelled, false)
    assert.equal(h.completions(), 0)
    const duplicate = state.send('不应重复发送')
    await duplicate
    assert.equal(h.requests.length, 2)
    h.requests[1].resolve({ response_id: 'new', safety_level: 'normal' })
    await nextSend
    assert.equal(h.render().busy, false)
    assert.equal(h.render().chatList[1].id, 'new')
    assert.equal(h.completions(), 1)
    assert.equal(h.reports.length, 0)
  })
}

test('stop during conversation creation ignores late creation and allows a fresh send', async () => {
  const h = await harness({ delayedCreate: true })
  const pending = h.render().send('创建中停止')
  h.render().stop()
  h.creation.resolve({ conversation_id: 'late-conversation' })
  await pending
  assert.equal(h.render().conversationId, '-1')
  assert.equal(h.render().busy, false)
  assert.equal(h.render().failure, null)
  assert.equal(h.requests.length, 0)
  const next = h.render().send('重新提问')
  await tick()
  assert.equal(h.requests[0].message, '重新提问')
  h.requests[0].resolve({ response_id: 'new', safety_level: 'normal' })
  await next
})

test('stop during buffered text playback prevents completion and preserves committed history', async () => {
  const h = await harness()
  const first = h.render().send('已完成的问题')
  await tick()
  h.requests[0].callbacks.onDelta('已完成的回答')
  h.requests[0].resolve({ response_id: 'first', safety_level: 'normal' })
  await first
  const committed = h.render().chatList
  const next = h.render().send('待中止的问题')
  await tick()
  h.requests[1].callbacks.onDelta('不完整的回答')
  h.render().stop()
  h.requests[1].resolve({ response_id: 'second', safety_level: 'normal' })
  await next
  assert.deepEqual(h.render().chatList, committed)
  assert.equal(h.completions(), 1)

  const buffered = await harness({ delayedPaint: true })
  const send = buffered.render().send('文字播放中')
  await tick()
  buffered.requests[0].resolve({ response_id: 'r1', safety_level: 'normal' })
  await tick()
  assert.equal(buffered.renderers[0].finishing, true)
  buffered.render().stop()
  await send
  assert.equal(buffered.render().busy, false)
  assert.equal(buffered.render().failure, null)
  assert.deepEqual(buffered.render().chatList, [])
  assert.equal(buffered.completions(), 0)
})

function composerHarness() {
  const slots = []
  let cursor = 0; let first = true; let responding = false; let stops = 0
  const sent = []
  const react = {
    useState(initial) {
      const index = cursor++
      if (first) { slots[index] = initial }
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useRef(initial) {
      const index = cursor++
      if (first) { slots[index] = { current: initial } }
      return slots[index]
    },
    useEffect() {},
    memo: component => component,
  }
  const filename = path.resolve(__dirname, '../app/components/chat/index.tsx')
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = mod.require.bind(mod)
  mod.require = name => {
    if (name === 'react') { return react }
    if (name === 'react/jsx-runtime') { return originalRequire(name) }
    if (name === 'react-i18next') { return { useTranslation: () => ({ t: key => key }) } }
    if (name.endsWith('/toast')) { return { notify() {} } }
    return () => null
  }
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename)
  function find(node, label) {
    if (!node || typeof node !== 'object') { return undefined }
    if (node.props?.['aria-label'] === label) { return node }
    const children = [node.props?.children].flat(Infinity)
    for (const child of children) {
      const match = find(child, label)
      if (match) { return match }
    }
  }
  function render() {
    cursor = 0
    const tree = mod.exports.default({ chatList: [], isResponding: responding, disabled: responding,
      onSend: message => { sent.push(message); responding = true },
      onStop: () => { stops++; responding = false },
    })
    first = false
    return {
      input: find(tree, '和小安说说话').props,
      button: find(tree, responding ? '停止回复' : '发送消息').props,
    }
  }
  return { render, sent, stops: () => stops }
}

for (const draft of ['', '提前输入的新问题']) {
  test(`composer restores original input or preserves a new draft after stopping: ${draft || 'empty'}`, () => {
    const h = composerHarness()
    h.render().input.onChange({ target: { value: '原来的问题' } })
    h.render().button.onClick()
    assert.deepEqual(h.sent, ['原来的问题'])
    assert.equal(h.render().input.value, '')
    if (draft) { h.render().input.onChange({ target: { value: draft } }) }
    h.render().button.onClick()
    const state = h.render()
    assert.equal(h.stops(), 1)
    assert.equal(state.input.value, draft || '原来的问题')
    assert.equal(state.button.disabled, false)
    state.input.onChange({ target: { value: '修改后重新发送' } })
    const ready = h.render()
    ready.input.onKeyUp({ code: 'Enter', shiftKey: false, preventDefault() {} })
    assert.deepEqual(h.sent, ['原来的问题', '修改后重新发送'])
  })
}
