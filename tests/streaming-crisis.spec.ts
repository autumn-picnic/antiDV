import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test.skip(!process.env.CLERK_E2E_STORAGE_STATE, 'Requires a configured Clerk test account and authenticated storage state')
test.use({ storageState: process.env.CLERK_E2E_STORAGE_STATE })

interface SmoothTestTurn {
  user: string
  assistant: string
  route_id: string
  safety_level: string
}

interface SmoothTestStream {
  conversationId: string
  responseId: string
  body: { message: string }
  controller: ReadableStreamDefaultController<Uint8Array>
  signal?: AbortSignal | null
}

declare global {
  interface Window {
    smoothFixture: {
      creates: number
      currentId: string | null
      history: Record<string, SmoothTestTurn[]>
      streams: SmoothTestStream[]
      responseRequests: string[]
    }
  }
}

test.use({
  baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3107',
  viewport: { width: 1280, height: 900 },
})

const question = '这是一条等待重试的原始问题'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const origin = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:3107').origin
    return new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  })
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window)
    const fixture: Window['smoothFixture'] = {
      creates: 0,
      currentId: null,
      history: {},
      streams: [],
      responseRequests: [],
    }
    window.smoothFixture = fixture
    window.fetch = async (input, init) => {
      const path = new URL(String(input), location.origin).pathname
      if (!path.startsWith('/v1/'))
        { return originalFetch(input, init) }
      if (path.includes('/responses'))
        { fixture.responseRequests.push(path) }
      if (path === '/v1/conversations' && init?.method === 'POST') {
        fixture.currentId = `conversation-${++fixture.creates}`
        fixture.history[fixture.currentId] = []
        return Response.json({ conversation_id: fixture.currentId })
      }
      if (path.endsWith('/responses/stream')) {
        const conversationId = path.split('/')[3]
        const responseId = `response-${fixture.streams.length + 1}`
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            fixture.streams.push({
              conversationId,
              responseId,
              body: JSON.parse(init?.body as string),
              controller,
              signal: init?.signal,
            })
          },
        })
        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
      }
      if (path.startsWith('/v1/conversations/')) {
        const id = path.endsWith('/current') ? fixture.currentId : path.split('/')[3]
        if (!id)
          { return Response.json({ detail: 'not found' }, { status: 404 }) }
        return Response.json({ conversation_id: id, turns: fixture.history[id] || [] })
      }
      return Response.json({ detail: 'not found' }, { status: 404 })
    }
  })
  await page.goto('/chat')
  await expect(page.getByRole('textbox')).toBeVisible()
})

async function send(page: Page, text = question, count = 1) {
  await page.getByRole('textbox').fill(text)
  await page.getByRole('textbox').press('Enter')
  await expect.poll(() => page.evaluate(() => window.smoothFixture.streams.length)).toBe(count)
}

async function emit(page: Page, index: number, name: string, payload: Record<string, unknown> = {}) {
  await page.evaluate(({ index, name, payload }) => {
    const stream = window.smoothFixture.streams[index]
    const data = {
      conversation_id: stream.conversationId,
      response_id: stream.responseId,
      ...payload,
    }
    stream.controller.enqueue(new TextEncoder().encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`))
  }, { index, name, payload })
}

async function complete(page: Page, safety = 'normal') {
  await emit(page, 0, 'completed', { safety_level: safety })
  await expect(page.getByRole('button', { name: '停止生成', exact: true })).toHaveCount(0)
}

test('large chunk is painted progressively, then completion preserves the entire answer', async ({ page }) => {
  await send(page)
  await emit(page, 0, 'start')
  await page.evaluate(() => {
    const lengths: number[] = []
    ;(window as any).paintLengths = lengths
    new MutationObserver(() => {
      const text = document.querySelector('[class*="answerWrap"]')?.textContent || ''
      lengths.push((text.match(/测/g) || []).length)
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  const text = '测'.repeat(500)
  await emit(page, 0, 'delta', { delta: text })
  await complete(page)
  await expect(page.getByText(text, { exact: true })).toBeVisible()
  const lengths = await page.evaluate(() => (window as any).paintLengths as number[])
  expect(lengths.some(length => length > 0 && length < 500)).toBeTruthy()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('cancel discards queued output and late crisis completion', async ({ page }) => {
  await send(page)
  await emit(page, 0, 'start')
  await emit(page, 0, 'delta', { delta: '旧'.repeat(500) })
  await page.getByRole('button', { name: '停止生成', exact: true }).click()
  await emit(page, 0, 'completed', { safety_level: 'immediate_danger' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[class*="answerWrap"]')).toHaveCount(0)
})

for (const safety of ['immediate_danger', 'self_harm']) {
  test(`${safety} keeps the answer visible without opening a safety-pack dialog`, async ({ page }) => {
    await send(page)
    await emit(page, 0, 'start')
    await emit(page, 0, 'delta', { delta: '我们可以继续聊。' })
    await complete(page, safety)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '确认退出并查看安全包' })).toHaveCount(0)
    await expect(page.getByText('我们可以继续聊。', { exact: true })).toBeVisible()
    await expect(page.getByRole('textbox')).toBeEnabled()
    await expect(page).toHaveURL(/\/chat$/)
    expect(await page.evaluate(() => window.smoothFixture.streams.length)).toBe(1)
  })
}

test('reduced motion displays complete chunk without animation delay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await send(page)
  await emit(page, 0, 'start')
  const text = '减少动态效果'.repeat(80)
  await emit(page, 0, 'delta', { delta: text })
  await expect(page.getByText(text, { exact: true })).toBeVisible()
  await complete(page)
})
