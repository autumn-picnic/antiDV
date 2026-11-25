const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
let rendering, submissions, routes, dismissed, save, signedIn, clerkUser
function reset() { submissions = []; routes = []; dismissed = 0; save = async () => {}; signedIn = false; clerkUser = null }
reset(); afterEach(reset)
const react = {
  useState(initial) {
    const runner = rendering; const index = runner.cursor++
    if (!(index in runner.cells)) runner.cells[index] = initial
    return [runner.cells[index], value => { runner.cells[index] = value }]
  },
  useRef(initial) {
    const runner = rendering; const index = runner.cursor++
    if (!(index in runner.cells)) runner.cells[index] = { current: initial }
    return runner.cells[index]
  },
  useEffect() {},
  useId() { return 'test-id' },
}
function load(file) {
  const filename = path.resolve(__dirname, '..', file)
  const mod = new Module(filename, module)
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = mod.require.bind(mod)
  mod.require = name => {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
    if (name === 'next/navigation') return { useRouter: () => ({ push: url => routes.push(url) }) }
    if (name === 'next/link') return { default: 'a' }
    if (name === '@clerk/nextjs') return { useUser: () => ({ isLoaded: true, isSignedIn: signedIn, user: clerkUser }) }
    if (name === '@heroicons/react/24/outline') return { UserCircleIcon: 'svg' }
    if (name === '@/hooks/use-modal-dialog') return { default() {} }
    if (name === '@/app/components/quick-exit') return { quickEscape() {} }
    if (name === '@/service/analysis-consent') return { prepareAnalysisConsent: async (...args) => { submissions.push(args); await save() } }
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`)
    return original(name)
  }
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename)
  return mod.exports
}
const Dialog = load('app/components/account/guest-login-prompt.tsx').default
const Controls = load('app/components/account/account-controls.tsx').default
function mount(Component, props) {
  const runner = { cells: [], cursor: 0, tree: null }
  runner.render = () => { rendering = runner; runner.cursor = 0; runner.tree = Component(props); rendering = null; return runner.tree }
  runner.render()
  return runner
}
function nodes(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(nodes)
  return [node, ...nodes(node.props?.children)]
}
const input = runner => nodes(runner.tree).find(node => node.type === 'input')
const button = (runner, label) => nodes(runner.tree).find(node => node.type === 'button' && node.props.children === label)
const dialog = () => mount(Dialog, { onContinue: () => { dismissed++ }, conversationId: 'guest-c1' })

test('checkbox starts unchecked and opting out still enters Clerk after saving false', async () => {
  const runner = dialog()
  assert.equal(input(runner).props.checked, false)
  await button(runner, '注册 / 登录').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(submissions, [[false, 'guest-c1']])
  assert.deepEqual(routes, ['/sign-up'])
  assert.equal(dismissed, 1)
})
test('checked consent includes the current guest conversation; navigation waits for server acknowledgement', async () => {
  let resolve
  save = () => new Promise(done => { resolve = done })
  const runner = dialog()
  input(runner).props.onChange({ target: { checked: true } }); runner.render()
  const register = button(runner, '注册 / 登录').props.onClick
  register(); register(); runner.render()
  assert.deepEqual(submissions, [[true, 'guest-c1']])
  assert.deepEqual(routes, [])
  assert.equal(input(runner).props.disabled, true)
  assert.equal(button(runner, '正在保存选择…').props.disabled, true)
  resolve(); await new Promise(done => setImmediate(done))
  assert.deepEqual(routes, ['/sign-up'])
})
test('declining the invitation does not save consent or enter Clerk', () => {
  const runner = dialog()
  input(runner).props.onChange({ target: { checked: true } }); runner.render()
  button(runner, '暂时不用').props.onClick()
  assert.equal(dismissed, 1)
  assert.deepEqual(submissions, [])
  assert.deepEqual(routes, [])
})
test('failed save stays in the dialog, preserves the selection and supports retry', async () => {
  save = async () => { throw new Error('保存失败') }
  const runner = dialog()
  input(runner).props.onChange({ target: { checked: true } }); runner.render()
  button(runner, '注册 / 登录').props.onClick()
  await new Promise(resolve => setImmediate(resolve)); runner.render()
  assert.equal(input(runner).props.checked, true)
  assert.equal(nodes(runner.tree).find(node => node.props.role === 'alert').props.children, '保存失败')
  assert.deepEqual(routes, [])
  save = async () => {}
  button(runner, '注册 / 登录').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(routes, ['/sign-up'])
})
test('guest avatar registration closes the menu and invokes the shared dialog without a Clerk link', () => {
  let opened = 0
  const runner = mount(Controls, { onOpenPrivacy() {}, onOpenMemory() {}, onRegister() { opened++ } })
  assert(nodes(runner.tree).some(node => node.type === 'summary' && node.props['aria-label'] === '账号菜单：登录或注册'))
  assert(!nodes(runner.tree).some(node => node.props.href === '/sign-up' || node.props.href === '/sign-in'))
  button(runner, '注册 / 登录').props.onClick({ currentTarget: { closest: () => ({ removeAttribute() {} }) } })
  assert.equal(opened, 1)
})


test('account nickname can be saved, displayed, and cleared without replacing other Clerk metadata', async () => {
  const updates = []
  signedIn = true
  clerkUser = {
    firstName: 'Existing name',
    publicMetadata: {},
    unsafeMetadata: { other: true },
    async updateMetadata({ unsafeMetadata }) {
      updates.push(unsafeMetadata)
      Object.assign(this.unsafeMetadata, unsafeMetadata)
    },
  }
  const runner = mount(Controls, {})
  const submit = () => nodes(runner.tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  const changeNickname = value => { input(runner).props.onChange({ target: { value } }); runner.render() }
  const displayedName = () => nodes(runner.tree).find(node => node.type === 'p').props.children
  assert.equal(displayedName(), '已登录：Existing name')
  button(runner, '设置昵称').props.onClick(); runner.render()
  changeNickname(' 小雨 ')
  await submit(); runner.render()
  assert.deepEqual(updates, [{ xiaoanNickname: '小雨' }])
  assert.equal(displayedName(), '已登录：小雨')
  button(runner, '编辑昵称').props.onClick(); runner.render()
  changeNickname('   ')
  await submit(); runner.render()
  assert.deepEqual(updates[1], { xiaoanNickname: null })
  assert.equal(clerkUser.unsafeMetadata.other, true)
  assert.equal(displayedName(), '已登录：Existing name')
})

test('failed nickname save preserves the draft and allows retry', async () => {
  signedIn = true
  let attempts = 0
  clerkUser = {
    publicMetadata: {},
    unsafeMetadata: {},
    async updateMetadata({ unsafeMetadata }) {
      if (++attempts === 1) throw new Error('Unavailable')
      Object.assign(this.unsafeMetadata, unsafeMetadata)
    },
  }
  const runner = mount(Controls, {})
  const submit = () => nodes(runner.tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  button(runner, '设置昵称').props.onClick(); runner.render()
  input(runner).props.onChange({ target: { value: '小雨' } }); runner.render()
  await submit(); runner.render()
  assert.equal(input(runner).props.value, '小雨')
  assert.equal(nodes(runner.tree).find(node => node.props.role === 'alert').props.children, '昵称保存失败，请重试。')
  await submit(); runner.render()
  assert.equal(input(runner), undefined)
  assert.equal(clerkUser.unsafeMetadata.xiaoanNickname, '小雨')
})
