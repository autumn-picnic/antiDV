// Real Chromium permission/MediaRecorder paths with a synthetic microphone, never physical audio.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const base = process.env.TEST_BASE_URL || 'http://localhost:3000'
;(async () => {
  const results = []
  for (const allow of [false, true]) {
    const browser = await chromium.launch({ channel: 'chrome', headless: true,
      args: allow ? ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] : ['--deny-permission-prompts'] })
    try {
      const page = await browser.newPage()
      let transcribed = 0
      await page.route('**/v1/**', route => {
        const path = new URL(route.request().url()).pathname
        return route.fulfill({ status: path.endsWith('/current') ? 404 : 200, contentType: 'application/json', body: JSON.stringify(path === '/v1/conversations' ? { items: [], next_offset: null } : path.endsWith('/options') ? { fields: [], default_allowed: false, default_retention_days: 30, max_retention_days: 90, provinces: {}, city_codes: [] } : {}) })
      })
      await page.route('**/api/speech/transcribe', route => { transcribed++; return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ text: '合成麥克風轉寫測試' }) }) })
      await page.goto(base + '/chat')
      const start = page.getByRole('button', { name: '开始录音', exact: true })
      await start.waitFor(); await page.waitForTimeout(1000); await start.click()
      await page.getByRole('button', { name: '请求麦克风权限', exact: true }).click()
      if (!allow) {
        await page.getByRole('heading', { name: '开启麦克风权限' }).waitFor()
        assert.equal(transcribed, 0)
        await page.keyboard.press('Escape')
        await page.locator('#chat-input').fill('拒絕麥克風後仍可輸入')
        results.push('browser permission denied: explanation, no upload, text input usable')
      }
      else {
        await start.waitFor(); await page.waitForTimeout(1000)
        assert.equal(await page.getByRole('button', { name: '结束录音', exact: true }).count(), 0)
        await start.click(); await page.waitForTimeout(1800)
        // The accessible label explicitly describes tap-to-finish.
        const labels = await page.locator('button[aria-label]').evaluateAll(es => es.map(e => e.getAttribute('aria-label')))
        const stopLabel = labels.find(label => /结束录音|停止录音/.test(label))
        assert.ok(stopLabel, labels.join(','))
        await page.getByRole('button', { name: stopLabel, exact: true }).click()
        await page.waitForFunction(() => document.querySelector('#chat-input').value.includes('合成麥克風轉寫測試'))
        assert.equal(transcribed, 1)
        assert.equal(await page.locator('#chat-content article').count(), 0)
        results.push('synthetic microphone: first permission does not record; tap recording transcribes draft without sending')
      }
    }
    finally { await browser.close() }
  }
  console.log(JSON.stringify(results, null, 2))
})().catch(e => { console.error(e); process.exit(1) })
