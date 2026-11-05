const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(file, overrides) {
  const filename = path.resolve(__dirname, '..', file)
  const mod = new Module(filename, module)
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  mod.require = name => overrides[name] || require(name)
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename)
  return mod.exports.default
}

test('global Escape respects overlays, composition, consumed keys and repeat; plain Escape exits', () => {
  const saved = Object.fromEntries(['window', 'document', 'localStorage', 'sessionStorage'].map(key => [key, globalThis[key]]))
  let handler; let layer = null; let cleared = 0; let destination
  const style = {}
  globalThis.window = { addEventListener: (_, fn) => { handler = fn }, dispatchEvent() {}, location: { replace: value => { destination = value } } }
  globalThis.document = { querySelector: () => layer, documentElement: { style } }
  globalThis.localStorage = globalThis.sessionStorage = { clear: () => { cleared++ } }
  try {
    const QuickExit = load('app/components/quick-exit/index.tsx', {
      react: { useEffect: fn => fn() }, 'next/navigation': { usePathname: () => '/chat' },
    })
    QuickExit()
    const event = extra => ({ key: 'Escape', preventDefault() {}, ...extra })
    for (const extra of [{ defaultPrevented: true }, { isComposing: true }, { keyCode: 229 }, { repeat: true }]) { handler(event(extra)) }
    layer = {}; handler(event())
    assert.equal(destination, undefined)
    layer = null; handler(event())
    assert.equal(destination, '/exit')
    assert.equal(style.visibility, 'hidden')
    assert.equal(cleared, 2)
  }
  finally { Object.assign(globalThis, saved) }
})

test('native modal isolates Escape and closes/restores connected trigger on cleanup', () => {
  const saved = { document: globalThis.document, HTMLElement: globalThis.HTMLElement }
  let cleanup; let keyHandler; let opened = 0; let closed = 0; let restored = 0; let stopped = 0
  class Element { isConnected = true; focus() { restored++ } }
  globalThis.HTMLElement = Element
  globalThis.document = { activeElement: new Element() }
  const element = {
    querySelector: () => ({ focus() { restored++ } }),
    addEventListener: (_, fn) => { keyHandler = fn }, removeEventListener() {},
    showModal: () => { opened++ }, close: () => { closed++ },
  }
  try {
    const useModal = load('hooks/use-modal-dialog.ts', { react: { useEffect: fn => { cleanup = fn() } } })
    useModal({ current: element })
    keyHandler({ key: 'Escape', stopPropagation: () => { stopped++ } })
    assert.equal(opened, 1)
    assert.equal(stopped, 1)
    cleanup()
    assert.equal(closed, 1)
    assert.equal(restored, 2)
  }
  finally { Object.assign(globalThis, saved) }
})
