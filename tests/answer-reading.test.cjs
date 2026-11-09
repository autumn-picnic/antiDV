const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const filename = path.resolve(__dirname, '../app/components/base/answer-paragraph.tsx')
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText
const exportsObject = {}
vm.runInNewContext(code, {
  exports: exportsObject,
  require: name => name.endsWith('.css') ? { default: { reference: 'reference' } } : require(name),
})
const { AnswerParagraph } = exportsObject
const render = children => renderToStaticMarkup(React.createElement(AnswerParagraph, null, children))

test('three legal references become small notes without changing wording or order', () => {
  const text = '先说明（《反家庭暴力法》第二十三条、第二十八条）。再说明（《反家庭暴力法》第二十五条）。最后（《反家庭暴力法》第二十四条）。'
  const html = render(text)
  assert.equal((html.match(/role="note"/g) || []).length, 3)
  assert.equal(html.replace(/<[^>]+>/g, ''), text)
})
test('streaming partial references and normal parentheses remain inline', () => {
  for (const text of ['说明（普通括号）。', '说明（《法律》第一', '说明（《法律', '说明（《法律》第一条', '（《法律》第一条', '(《法律》第一条']) {
    assert.equal(render(text), `<p>${text}</p>`)
  }
})
test('English parentheses are supported; newline and mismatched parentheses are not grouped', () => {
  assert.match(render('说明(《法律》第一条)。'), /role="note"/)
  assert.doesNotMatch(render('说明（《法律》第一条\n第二条）。'), /role="note"/)
  assert.doesNotMatch(render('说明（《法律》第一条)。'), /role="note"/)
})
test('existing emphasis survives and literal HTML is escaped', () => {
  const html = render([React.createElement('strong', { key: 'bold' }, '核心结论'), '<script>bad()</script>', '（《法律》第一条）。'])
  assert.match(html, /<strong>核心结论<\/strong>/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /role="note"/)
})
test('code and links keep their content and destinations', () => {
  const html = render([
    React.createElement('code', { key: 'code' }, '（《法律》第一条）'),
    React.createElement('a', { key: 'link', href: 'https://example.com' }, '（《法律》第二条）'),
  ])
  assert.doesNotMatch(html, /role="note"/)
  assert.match(html, /href="https:\/\/example.com"/)
})
test('Markdown custom link components retain their original children', () => {
  function MarkdownLink({ children }) {
    return React.createElement('a', { href: 'https://example.com' }, children)
  }
  const html = render(React.createElement(MarkdownLink, { node: { tagName: 'a' } }, '（《法律》第一条）'))
  assert.doesNotMatch(html, /role="note"/)
  assert.match(html, /href="https:\/\/example.com"/)
})
