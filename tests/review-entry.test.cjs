const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const filename = path.resolve(__dirname, '../app/components/chat/answer/index.tsx')
const mod = new Module(filename, module)
mod.filename = filename
mod.paths = Module._nodeModulePaths(path.dirname(filename))
const originalRequire = mod.require.bind(mod)
const css = new Proxy({}, { get: (_, name) => name })
mod.require = name => {
  if (name.endsWith('style.module.css')) return { __esModule: true, default: css }
  if (name === '@/config/brand-assets') return { brandAssets: { avatar: '/avatar.png', avatarSize: 'cover' } }
  if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) }
  if (name === '@/utils/string') return { randomString: () => 'test' }
  if (name === '@/app/components/base/tooltip') return { __esModule: true, default: ({ children }) => React.createElement('span', null, children) }
  if (name === '@/app/components/base/streamdown-markdown') return { __esModule: true, default: ({ content }) => React.createElement('p', null, content) }
  if (name === '@/app/components/base/button' || name === './review-modal' || name === '../debug-panel' || name === '../loading-anim') return { __esModule: true, default: () => null }
  return originalRequire(name)
}
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename)
const Answer = mod.exports.default
const render = props => renderToStaticMarkup(React.createElement(Answer, { item: { id: 'r1', content: '测试回答', isAnswer: true }, feedbackDisabled: false, onReview: async () => {}, ...props }))

test('completed answers expose a persistent native review button without a hover-only wrapper', () => {
  const html = render({})
  assert.match(html, /<button[^>]*aria-label="评分与反馈"/)
  assert(!html.includes('itemOperation'))
  assert(html.includes('absolute top-[-14px] right-[-14px]'))
})
test('streaming answers hide the review button', () => {
  assert(!render({ isResponding: true }).includes('aria-label="评分与反馈"'))
})
test('saved reviews expose edit action and keep their score', () => {
  const html = render({ item: { id: 'r1', content: '回答', isAnswer: true, userReview: { score: 4, comment: '建议' } } })
  assert.match(html, /aria-label="修改评分与反馈"/)
  assert(html.includes('建议'))
})
