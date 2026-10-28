const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

for (const count of [0, 19, 20, 21, 100]) {
  test(`new conversation remains visible and usable with ${count} history entries`, () => {
    let newChatProps
    let selected
    const filename = path.resolve(__dirname, '../app/components/sidebar/index.tsx')
    const mod = new Module(filename, module)
    mod.filename = filename
    mod.paths = Module._nodeModulePaths(path.dirname(filename))
    const originalRequire = mod.require.bind(mod)
    mod.require = name => {
      if (name === 'react-i18next') {
        return { useTranslation: () => ({ t: () => '新对话' }) }
      }
      if (name === '@/app/components/base/button') {
        return function Button(props) {
          newChatProps = props
          return React.createElement('button', props)
        }
      }
      return originalRequire(name)
    }
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename)
    const list = Array.from({ length: count }, (_, i) => ({ id: `c${i}`, name: `对话 ${i}` }))
    const html = renderToStaticMarkup(React.createElement(mod.exports.default, {
      copyRight: '小安', currentId: 'c0', list,
      onCurrentIdChange: id => { selected = id },
      onDeleteConversation() {}, onClearAll() {},
    }))
    assert.ok(html.includes('新对话'))
    assert.ok(newChatProps)
    assert.ok(!newChatProps.disabled)
    newChatProps.onClick()
    assert.equal(selected, '-1')
    assert.equal(html.includes('清空全部对话'), count > 0)
    assert.equal((html.match(/title="删除此对话"/g) || []).length, count)
  })
}
