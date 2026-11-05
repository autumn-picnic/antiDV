// Production UI regression with synthetic API responses; no real user data or microphone.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const base = process.env.TEST_BASE_URL || 'http://localhost:3000'
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => sessionStorage.setItem('xiaoan_guest_login_prompt', JSON.stringify({ completedTurns: 0, dismissed: true })))
  const page = await context.newPage()
  const results = []; const errors = []
  page.on('pageerror', e => errors.push(e.message))
  let level = 'normal'; let delay = 0; let fail = false; let serial = 0; let deleted = false
  const policy = { mode: 'rolling', retention_days: 30, expiry_basis: 'last_completed_turn', expires_at: null, policy_version: 0, idle_timeout_seconds: null }
  await page.route('**/v1/**', async route => {
    const u = new URL(route.request().url()); const path = u.pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path.endsWith('/responses/stream')) {
      const id = path.split('/')[3]; const response_id = `r${++serial}`; const safety_level = level; const failed = fail
      await new Promise(r => setTimeout(r, delay))
      const data = { conversation_id: id, response_id }
      const event = (name, value) => `event: ${name}\ndata: ${JSON.stringify({ ...data, ...value })}\n\n`
      return route.fulfill({ contentType: 'text/event-stream', body: event('start', {}) + event('delta', { delta: `合成測試回答 ${serial}` }) + (failed ? event('error', { code: 'service_unavailable' }) : event('completed', { safety_level })) }).catch(() => {})
    }
    if (path === '/v1/conversations' && route.request().method() === 'POST') return json({ conversation_id: 'new-chat' }, 201)
    if (path === '/v1/conversations') return json({ items: deleted ? [] : [{ id: 'history-one' }], next_offset: null })
    if (path.endsWith('/current')) return json({}, 404)
    if (path.endsWith('/policy')) return json(policy)
    if (path === '/v1/privacy/options') return json({ fields: ['region', 'nickname', 'preferences'], default_allowed: false, default_retention_days: 30, max_retention_days: 90, provinces: {}, city_codes: [] })
    if (route.request().method() === 'DELETE') { deleted = true; return route.fulfill({ status: 204 }) }
    return json({ conversation_id: path.split('/')[3], turns: [], next_after: null })
  })
  await page.goto(base + '/chat')
  const send = page.getByRole('button', { name: '发送消息', exact: true })
  await send.waitFor(); await page.waitForTimeout(1200)
  async function message(text) {
    await page.locator('#chat-input').fill(text)
    await send.click()
  }
  const crisis = page.getByRole('dialog', { name: '你可以选择接下来怎么做' })
  await message('一般回覆'); await page.getByText('合成測試回答 1', { exact: true }).waitFor()
  await send.waitFor({ state: 'visible' }); await page.waitForTimeout(600)
  assert.equal(await crisis.count(), 0); results.push('normal reply and status notice')
  level = 'self_harm'; delay = 700
  await message('危機標記樣例')
  await page.locator('details.chat-settings summary').click()
  await page.waitForTimeout(1600)
  assert.equal(await crisis.count(), 0)
  await page.keyboard.press('Escape'); await crisis.waitFor()
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '继续聊天')
  const box = await crisis.boundingBox()
  assert.ok(Math.abs(box.x + box.width / 2 - 720) < 1 && Math.abs(box.y + box.height / 2 - 450) < 1)
  await page.keyboard.press('Escape'); assert.ok(page.url().endsWith('/chat'))
  results.push('crisis waits for existing settings menu, centers, focuses Continue, Escape returns to chat')
  delay = 0
  await message('持續危機'); await page.getByText('合成測試回答 3', { exact: true }).waitFor(); await page.waitForTimeout(500)
  assert.equal(await crisis.count(), 0); results.push('continuous crisis does not repeat')
  level = 'normal'; await message('一般狀態'); await page.getByText('合成測試回答 4', { exact: true }).waitFor(); await page.waitForTimeout(500)
  level = 'immediate_danger'; await message('再次危機'); await crisis.waitFor()
  await crisis.getByRole('button', { name: '继续聊天', exact: true }).click()
  results.push('new normal rearms later crisis')
  delay = 2000; await message('停止測試')
  await page.getByRole('button', { name: '停止回复', exact: true }).click()
  await page.waitForTimeout(2200); assert.equal(await crisis.count(), 0); results.push('stop ignores late completion')
  delay = 0; fail = true; await message('失敗測試'); await page.getByRole('button', { name: '刷新会话记录', exact: true }).waitFor()
  assert.equal(await crisis.count(), 0); results.push('failure recovery entry and no crisis prompt')
  await page.locator('main').evaluate(e => { e.scrollTop = e.scrollHeight })
  await page.getByRole('button', { name: '刷新会话记录', exact: true }).click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: '展开左边栏', exact: true }).click()
  const history = page.locator('nav[aria-label="历史对话"] button').filter({ hasText: '对话 history-' }).first()
  await history.click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /删除对话：对话 history-/ }).click()
  await page.getByRole('button', { name: '确定删除', exact: true }).click(); await page.waitForTimeout(400)
  assert.equal(deleted, true); results.push('history selection and confirmed deletion')
  await page.getByRole('button', { name: '隐私与保存', exact: true }).click()
  await page.getByRole('dialog', { name: '隐私与保存' }).waitFor(); await page.keyboard.press('Escape')
  results.push('privacy dialog opens and Escape closes')
  for (const [width, height] of [[390, 844], [320, 480]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(300)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.locator('#chat-input').scrollIntoViewIfNeeded(); await page.locator('#chat-input').focus()
    assert.equal(await page.locator('#chat-input').evaluate(e => e === document.activeElement), true)
  }
  results.push('320px and 390px layouts, input focus and no document horizontal overflow')
  await page.getByRole('button', { name: '快速离开此页面', exact: true }).click()
  await page.waitForURL('**/exit'); results.push('quick exit navigates to dedicated exit flow')
  assert.deepEqual(errors, [])
  fs.writeFileSync('/tmp/xiaoan-browser-results.json', JSON.stringify({ results, errors }, null, 2))
  console.log(JSON.stringify({ results, errors }, null, 2))
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
