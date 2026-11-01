const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const originalFetch = globalThis.fetch
const previousKey = process.env.AZURE_SPEECH_KEY
const previousRegion = process.env.AZURE_SPEECH_REGION
afterEach(() => {
  globalThis.fetch = originalFetch
  if (previousKey === undefined) { delete process.env.AZURE_SPEECH_KEY }
  else { process.env.AZURE_SPEECH_KEY = previousKey }
  if (previousRegion === undefined) { delete process.env.AZURE_SPEECH_REGION }
  else { process.env.AZURE_SPEECH_REGION = previousRegion }
})

function load(file, overrides = {}) {
  const filename = path.resolve(__dirname, '..', file)
  const mod = new Module(filename, module)
  mod.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name)
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
  return mod.exports
}
const audio = load('utils/speech-audio.ts')
const policy = load('lib/auth/policy.ts')
function route(actor = null) {
  return load('app/api/speech/transcribe/route.ts', {
    '@/lib/auth/server': { optionalActor: async () => actor },
    '@/lib/auth/policy': policy, '@/utils/speech-audio': audio,
  }).POST
}
const wav = () => audio.encodeSpeechWav([new Float32Array(48000).fill(0.2)], 48000)
function request(body = wav(), origin = 'https://xiaoan.test', language = 'zh-CN') {
  return new Request(`https://xiaoan.test/api/speech/transcribe?language=${language}`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'audio/wav' }, body,
  })
}
function configured() { process.env.AZURE_SPEECH_KEY = 'test-secret'; process.env.AZURE_SPEECH_REGION = 'japaneast' }

test('48kHz mic audio becomes bounded 16kHz mono PCM with matching duration and amplitude', () => {
  const buffer = wav(); const view = new DataView(buffer)
  assert.equal(buffer.byteLength, 32044)
  assert.equal(view.getUint32(24, true), 16000)
  assert.equal(view.getInt16(44, true), 6553)
  assert.equal(audio.validSpeechWav(new Uint8Array(buffer)), true)
  view.setUint32(24, 48000, true)
  assert.equal(audio.validSpeechWav(new Uint8Array(buffer)), false)
  assert.equal(audio.validSpeechWav(new Uint8Array(45)), false)
})

test('same-origin guest transcription uses only Japan East and returns text without provider metadata', async () => {
  configured()
  globalThis.fetch = async (url, init) => {
    assert.match(url, /^https:\/\/japaneast\.stt\.speech\.microsoft\.com\//)
    assert.equal(init.headers['Ocp-Apim-Subscription-Key'], 'test-secret')
    assert.equal(audio.validSpeechWav(init.body), true)
    return Response.json({ RecognitionStatus: 'Success', DisplayText: '我需要帮助。', NBest: [{ Confidence: 0.8 }] })
  }
  const response = await route()(request())
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { text: '我需要帮助。' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('rejects cross-origin, invalid locale, wrong region, malformed and oversized WAV before calling provider', async () => {
  configured(); let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('must not call') }
  const post = route()
  assert.equal((await post(request(wav(), 'https://other.test'))).status, 403)
  assert.equal((await post(request(wav(), 'https://xiaoan.test', 'en-US'))).status, 400)
  assert.equal((await post(request(new Uint8Array(100)))).status, 400)
  assert.equal((await post(request(new Uint8Array(audio.SPEECH_MAX_BYTES + 1)))).status, 413)
  process.env.AZURE_SPEECH_REGION = 'southeastasia'
  assert.equal((await post(request())).status, 503)
  assert.equal(calls, 0)
})

test('no-match and service failures preserve useful error messages without raw provider details', async () => {
  configured(); const post = route()
  globalThis.fetch = async () => Response.json({ RecognitionStatus: 'NoMatch' })
  assert.equal((await post(request())).status, 422)
  globalThis.fetch = async () => new Response('secret provider diagnostics', { status: 500 })
  const response = await post(request())
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /secret provider/)
})

test('rapid guest requests hit the per-process budget', async () => {
  configured(); const post = route()
  globalThis.fetch = async () => Response.json({ RecognitionStatus: 'Success', DisplayText: '好。' })
  for (let i = 0; i < 12; i++) { assert.equal((await post(request())).status, 200) }
  assert.equal((await post(request())).status, 429)
})

// Browser lifecycle test with the actual hook: cancel invalidates a pending response.
test('cancel stops tracks, aborts transcription and discards a late result', async () => {
  const slots = []; let cursor = 0; const effects = []; const received = []
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) { slots[i] = initial } return [slots[i], v => { slots[i] = v }] },
    useRef(initial) { const i = cursor++; if (!(i in slots)) { slots[i] = { current: initial } } return slots[i] },
    useCallback(fn) { return fn }, useEffect(fn) { effects.push(fn) },
  }
  const saved = { window: globalThis.window, navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'), AudioContext: globalThis.AudioContext, AudioWorkletNode: globalThis.AudioWorkletNode }
  let stopped = false; let resolveFetch; let fetchSignal
  class Context {
    sampleRate = 48000; state = 'running'; destination = {}; audioWorklet = { addModule: async () => {} }
    resume = async () => {}; close = async () => { this.state = 'closed' }
    createMediaStreamSource = () => ({ connect() {}, disconnect() {} })
  }
  class Worklet { port = { onmessage: null }; connect() {} disconnect() {} }
  globalThis.window = { AudioContext: Context, AudioWorkletNode: Worklet }
  globalThis.AudioContext = Context; globalThis.AudioWorkletNode = Worklet
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => { stopped = true } }] }) } } })
  globalThis.fetch = async (_url, init) => { fetchSignal = init.signal; return new Promise(resolve => { resolveFetch = resolve }) }
  try {
    const hook = load('hooks/use-speech-input.ts', { react, '@/utils/speech-audio': audio }).default
    const speech = hook(text => received.push(text), 'c1', false)
    await speech.start()
    const pending = speech.finish()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(stopped, true)
    speech.cancel()
    assert.equal(fetchSignal.aborted, true)
    resolveFetch(Response.json({ text: '迟到的录音结果' }))
    await pending
    assert.deepEqual(received, [])
  }
  finally {
    globalThis.window = saved.window; globalThis.AudioContext = saved.AudioContext; globalThis.AudioWorkletNode = saved.AudioWorkletNode
    if (saved.navigator) { Object.defineProperty(globalThis, 'navigator', saved.navigator) }
    else { delete globalThis.navigator }
  }
})
