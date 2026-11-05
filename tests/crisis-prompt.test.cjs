const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
function load(file, overrides = {}) {
  const mod = new Module(file, module)
  mod.require = name => overrides[name] || require(name)
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, file)
  return mod.exports
}
const { CrisisPromptPolicy } = load('utils/crisis-prompt.ts')
const done = (responseId, safetyLevel, conversationId = 'a') => ({ id: responseId, responseId, safetyLevel, conversationId, kind: 'completed' })
test('only fresh completed crisis results trigger; history and failed/stopped requests do not', () => {
  const p = new CrisisPromptPolicy()
  for (const op of [null, done('n', 'normal'), done('u', 'unclear'), { ...done('s', 'self_harm'), kind: 'stopped' }, { ...done('f', 'self_harm'), kind: 'failed' }, done('old', 'self_harm', 'b')]) {
    p.update('a', op); assert.equal(p.show(), false)
  }
  p.update('a', done('r', 'immediate_danger')); assert.equal(p.show(), true)
  p.update('a', done('r', 'immediate_danger')); assert.equal(p.show(), false)
})
test('continuous crisis prompts once; unclear does not rearm, new normal does', () => {
  const p = new CrisisPromptPolicy()
  p.update('a', done('1', 'self_harm')); assert.equal(p.show(), true)
  p.update('a', done('2', 'unclear')); p.update('a', done('3', 'immediate_danger')); assert.equal(p.show(), false)
  p.update('a', done('4', 'normal')); p.update('a', done('5', 'self_harm')); assert.equal(p.show(), true)
})
test('queued prompt cancels on switch, newer operation, normal or exit; conversations are independent', () => {
  for (const next of [null, done('2', 'normal'), { ...done('2', 'self_harm'), kind: 'sending' }]) {
    const p = new CrisisPromptPolicy(); p.update('a', done('1', 'self_harm')); p.update('a', next); assert.equal(p.show(), false)
  }
  const p = new CrisisPromptPolicy(); p.update('a', done('1', 'self_harm')); p.update('b', null); assert.equal(p.show(), false)
  p.update('b', done('2', 'self_harm', 'b')); assert.equal(p.show(), true)
  p.update('a', done('1', 'self_harm')); assert.equal(p.show(), false)
  p.update('a', done('3', 'self_harm')); p.pending = null; assert.equal(p.show(), false)
})
test('hook waits for overlay close, presents once, and disconnects on cleanup', () => {
  const saved = Object.fromEntries(['document', 'window', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame'].map(k => [k, globalThis[k]]))
  let effect; let callback; let frame; let visible; let blocked = true; let disconnected = false; let exit
  globalThis.document = { body: {}, querySelector: () => blocked ? {} : null }
  globalThis.window = { addEventListener: (_, fn) => { exit = fn }, removeEventListener() {} }
  globalThis.MutationObserver = class { constructor(fn) { callback = fn } observe() {} disconnect() { disconnected = true } }
  globalThis.requestAnimationFrame = fn => { frame = fn; return 1 }
  globalThis.cancelAnimationFrame = () => {}
  try {
    const hook = load('hooks/use-crisis-prompt.ts', {
      react: { useRef: value => ({ current: value }), useState: () => [null, value => { visible = value }], useEffect: fn => { effect = fn } },
      '../utils/crisis-prompt': { CrisisPromptPolicy },
    }).default
    hook('a', done('1', 'self_harm'))
    const cleanup = effect(); frame(); assert.equal(visible, null)
    blocked = false; callback(); frame(); assert.equal(visible, 'a')
    exit(); assert.equal(visible, null); callback(); frame(); assert.equal(visible, null)
    cleanup(); assert.equal(disconnected, true)
  }
  finally { Object.assign(globalThis, saved) }
})
