const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const React = require('react')
const { renderToString } = require('react-dom/server')

function loadHook(react = React) {
  const filename = path.resolve(__dirname, '../hooks/use-breakpoints.ts')
  const mod = new Module(filename, module)
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  mod.require = name => name === 'react' ? react : require(name)
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename)
  return mod.exports.default
}

test('server and initial client render match at mobile, tablet and desktop widths', () => {
  const saved = globalThis.innerWidth
  const hook = loadHook()
  const View = () => React.createElement('span', null, hook())
  try {
    delete globalThis.innerWidth
    const server = renderToString(React.createElement(View))
    for (const width of [375, 640, 768, 1440]) {
      globalThis.innerWidth = width
      assert.equal(renderToString(React.createElement(View)), server)
    }
  }
  finally { if (saved === undefined) { delete globalThis.innerWidth } else { globalThis.innerWidth = saved } }
})

test('mount reads actual viewport, resize updates it, and unmount removes listener', () => {
  const saved = globalThis.window
  let effect, listener
  const values = []
  const fakeReact = { useState: initial => { assert.equal(initial, null); return [initial, value => values.push(value)] }, useEffect: callback => { effect = callback } }
  globalThis.window = {
    innerWidth: 375,
    addEventListener: (name, handler) => { assert.equal(name, 'resize'); listener = handler },
    removeEventListener: (name, handler) => { assert.equal(name, 'resize'); assert.equal(handler, listener); listener = null },
  }
  try {
    assert.equal(loadHook(fakeReact)(), 'pc')
    const cleanup = effect()
    assert.deepEqual(values, [375])
    globalThis.window.innerWidth = 1440
    listener()
    assert.deepEqual(values, [375, 1440])
    cleanup()
    assert.equal(listener, null)
  }
  finally { if (saved === undefined) { delete globalThis.window } else { globalThis.window = saved } }
})
