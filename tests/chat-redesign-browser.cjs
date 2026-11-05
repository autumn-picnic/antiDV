const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const base = process.env.TEST_BASE_URL || 'http://localhost:3001'
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(base + '/v1/**', route => {
      const path = new URL(route.request().url()).pathname
      return route.fulfill({ status: path.endsWith('/current') ? 404 : 200, contentType: 'application/json', body: JSON.stringify(path === '/v1/conversations' ? { items: [], next_offset: null } : { fields: [], default_allowed: false, default_retention_days: 30, max_retention_days: 90, provinces: {}, city_codes: [] }) })
    })
    await page.goto(base + '/chat', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.getByRole('button', { name: '按住说话，松开转写', exact: true }).waitFor()
    await page.waitForFunction(() => !document.querySelector('.chat-microphone').disabled)
    assert.equal(await page.locator('.chat-starters button').count(), 4)
    await page.getByRole('button', { name: '算家暴吗？', exact: true }).click()
    assert.equal(await page.locator('#chat-input').inputValue(), '我遇到的这些，算家暴吗？')
    assert.equal(await page.locator('#chat-content article').count(), 0)
    await page.locator('#chat-input').fill('')
    await page.locator('.chat-toolbar > summary').click()
    assert.equal(await page.locator('.chat-toolbar [aria-label="新建对话"]').count(), 0)
    await page.keyboard.press('Escape')
    await page.locator('main').click({ position: { x: 5, y: 5 } })
    await page.getByRole('button', { name: '展开左边栏', exact: true }).waitFor()
    await page.getByRole('button', { name: '历史', exact: true }).click()
    await page.getByRole('button', { name: '隐私与保存', exact: true }).waitFor()
    await page.screenshot({ path: 'docs/design/shadcn-chat-v1/implementation/desktop.png' })
    for (const [width, height] of [[390, 844], [320, 480]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(400)
      const sizes = await page.locator('.chat-starters button').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect()
        return { y: box.y, width: box.width, height: box.height, clipped: element.scrollWidth > element.clientWidth }
      }))
      assert.equal(new Set(sizes.map(size => size.y)).size, 1)
      assert.ok(sizes.every(size => size.width >= 44 && size.height >= 44 && !size.clipped))
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      const composer = await page.locator('.chat-composer').boundingBox()
      assert.ok(composer.height <= 60 && composer.y + composer.height <= height)
      await page.getByRole('button', { name: '历史', exact: true }).click()
      await page.getByRole('dialog', { name: '历史对话' }).waitFor()
      // The native dialog backdrop exposes the underlying chat as a dismissal target.
      await page.mouse.click(width - 5, height / 2)
      await page.getByRole('dialog', { name: '历史对话' }).waitFor({ state: 'detached' })
      assert.ok(page.url().endsWith('/chat'))
      if (width === 390) await page.screenshot({ path: 'docs/design/shadcn-chat-v1/implementation/mobile.png' })
    }
    assert.deepEqual(errors, [])
    console.log('Desktop/mobile layout, draft chips, toolbar, history toggle/backdrop, 320px reflow and 58px composer: PASS')
  }
  finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
