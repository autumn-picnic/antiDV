const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

// Run the actual hooks with deterministic state/effects and mocked network/storage.
let rendering
const react = {
  useState(initial) {
    const runner = rendering, index = runner.cursor++
    if (!(index in runner.cells)) runner.cells[index] = typeof initial === 'function' ? initial() : initial
    return [runner.cells[index], value => { runner.cells[index] = typeof value === 'function' ? value(runner.cells[index]) : value }]
  },
  useRef(initial) {
    const runner = rendering, index = runner.cursor++
    if (!(index in runner.cells)) runner.cells[index] = { current: initial }
    return runner.cells[index]
  },
  useEffect(effect, deps) {
    const runner = rendering, index = runner.cursor++, previous = runner.cells[index]
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
      runner.effects.push(() => { previous?.cleanup?.(); runner.cells[index] = { deps, cleanup: effect() } })
    }
  },
}
let failSend = false
const service = {
  ChatApiError: class extends Error {},
  fetchConversations: async () => [],
  fetchCurrentConversation: async () => null,
  fetchReviews: async () => { throw new Error('Guests must not fetch account reviews') },
  createConversation: async () => ({ conversation_id: 'c1' }),
  sendChatMessage: async (_, __, callbacks) => {
    if (failSend) throw new Error('Interrupted response')
    callbacks.onDelta('小安的回复')
    return { response_id: 'r1', safety_level: 'normal' }
  },
}
const cache = new Map()
function load(file) {
  const filename = path.resolve(__dirname, '..', file)
  if (cache.has(filename)) return cache.get(filename).exports
  const mod = new Module(filename, module)
  cache.set(filename, mod)
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = mod.require.bind(mod)
  mod.require = name => {
    if (name === 'react') return react
    if (name === '@/service' || name === '../service') return service
    if (name === '../utils/stream-renderer') return { createStreamRenderer: append => ({ push: append, finish: async () => {}, cancel() {} }) }
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`)
    return originalRequire(name)
  }
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
  return mod.exports
}
function hooks(render) {
  const runner = { cells: [], cursor: 0, effects: [], value: null }
  runner.render = () => {
    rendering = runner
    runner.cursor = 0
    runner.value = render()
    rendering = null
    while (runner.effects.length) runner.effects.shift()()
    return runner.value
  }
  runner.render()
  return runner
}
const { readGuestPrompt, shouldPromptGuest } = load('lib/auth/guest-prompt.ts')
const useGuestLoginPrompt = load('hooks/use-guest-login-prompt.ts').default
const useChatflow = load('hooks/use-chatflow.ts').default

test('prompt begins at five completed turns and stays optional for guests', () => {
  for (let count = 0; count < 5; count++) assert.equal(shouldPromptGuest({ completedTurns: count, dismissed: false }, false), false)
  assert.equal(shouldPromptGuest({ completedTurns: 5, dismissed: false }, false), true)
  assert.equal(shouldPromptGuest({ completedTurns: 6, dismissed: true }, false), false)
  assert.equal(shouldPromptGuest({ completedTurns: 5, dismissed: false }, true), false)
  for (const value of [null, 'broken', '{}', '{"completedTurns":-1,"dismissed":false}']) assert.deepEqual(readGuestPrompt(value), { completedTurns: 0, dismissed: false })
})

test('actual chat completion counts five rounds; interruption does not count; continue survives remount', async () => {
  const storage = new Map()
  global.sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }
  try {
    const prompt = hooks(() => useGuestLoginPrompt(false))
    const chat = hooks(() => useChatflow({ authReady: true, signedIn: false, onCompleted: () => prompt.value.completed() }))
    await new Promise(resolve => setImmediate(resolve))
    chat.render()
    for (let i = 0; i < 4; i++) {
      await chat.value.send('测试消息')
      chat.render(); prompt.render()
      assert.equal(prompt.value.visible, false)
    }
    failSend = true
    await chat.value.send('中断的消息')
    chat.render(); prompt.render()
    assert.equal(prompt.value.visible, false)
    failSend = false
    await chat.value.send('第五轮')
    chat.render(); prompt.render()
    assert.equal(prompt.value.visible, true)
    prompt.value.dismiss(); prompt.render()
    assert.equal(prompt.value.visible, false)
    await chat.value.send('第六轮仍可聊天')
    chat.render(); prompt.render()
    assert.equal(prompt.value.visible, false)
    const restored = hooks(() => useGuestLoginPrompt(false))
    assert.equal(restored.render().visible, false)
  }
  finally { delete global.sessionStorage; failSend = false }
})

test('blocked browser storage still permits counting and continuing without registration', () => {
  global.sessionStorage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  try {
    const prompt = hooks(() => useGuestLoginPrompt(false))
    for (let i = 0; i < 5; i++) { prompt.value.completed(); prompt.render() }
    assert.equal(prompt.value.visible, true)
    prompt.value.dismiss(); prompt.render()
    assert.equal(prompt.value.visible, false)
  }
  finally { delete global.sessionStorage }
})
