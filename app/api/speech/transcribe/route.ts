import { saveSpeechRecording, completeSpeechRecording } from '@/lib/feedback/speech-repository'
import { optionalActor } from '@/lib/auth/server'
import { AccessError, accessResponse, assertSameOrigin } from '@/lib/auth/policy'
import { SPEECH_MAX_BYTES, validSpeechWav } from '@/utils/speech-audio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Per-process backstop; deployment ingress should also enforce a shared rate limit.
const limits = new Map<string, { start: number, count: number }>()
let inFlight = 0

export async function POST(request: Request) {
  let acquired = false
  let recordingId: string | null = null
  try {
    assertSameOrigin(request)
    const actor = await optionalActor()
    const key = process.env.AZURE_SPEECH_KEY?.trim()
    if (!key || process.env.AZURE_SPEECH_REGION !== 'japaneast') {
      throw new AccessError(503, '语音输入暂未开启，请使用文字输入')
    }
    if (!request.headers.get('content-type')?.startsWith('audio/wav')) { throw new AccessError(415, '录音格式不受支持，请重新录音') }
    const now = Date.now()
    for (const [id, entry] of limits) { if (now - entry.start > 60000) { limits.delete(id) } }
    // Guests share a conservative bucket; no client-controlled identifier can bypass it.
    const id = actor ? `user:${actor.userId}` : 'guest'
    const entry = limits.get(id) || { start: now, count: 0 }
    if (entry.count >= 12 || inFlight >= 4) { throw new AccessError(429, '语音请求较多，请稍后再试') }
    entry.count++; limits.set(id, entry)
    inFlight++; acquired = true
    if (!request.body) { throw new AccessError(400, '没有收到录音') }
    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) { break }
        length += value.length
        if (length > SPEECH_MAX_BYTES) {
          await reader.cancel()
          throw new AccessError(413, '录音过长，请分成短句录制')
        }
        chunks.push(value)
      }
    }
    finally { reader.releaseLock() }
    const audio = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.length }
    if (!validSpeechWav(audio)) { throw new AccessError(400, '录音无效或太短，请重新录音') }
    recordingId = await saveSpeechRecording(actor, audio)
    const controller = new AbortController()
    const abort = () => controller.abort()
    request.signal.addEventListener('abort', abort, { once: true })
    if (request.signal.aborted) { controller.abort() }
    const timer = setTimeout(abort, 35000)
    try {
      const form = new FormData()
      form.set('audio', new Blob([audio], { type: 'audio/wav' }), 'recording.wav')
      // Omit locales: Azure's multilingual model detects the language itself.
      form.set('definition', JSON.stringify({ profanityFilterMode: 'None' }))
      const upstream = await fetch('https://japaneast.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15', {
        method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key },
        body: form, signal: controller.signal, cache: 'no-store', redirect: 'error',
      })
      if (!upstream.ok) { throw new AccessError(upstream.status === 429 ? 429 : 503, '语音识别暂时不可用，请稍后重试或使用文字输入') }
      const result = await upstream.json()
      const text = Array.isArray(result?.combinedPhrases) ? result.combinedPhrases.map((phrase: { text?: unknown }) => typeof phrase.text === 'string' ? phrase.text : '').join(' ').trim() : ''
      if (typeof text !== 'string' || !text.trim()) { throw new AccessError(422, '没有听清这段录音，请靠近麦克风重新录制') }
      if (text.length > 4000) { throw new AccessError(422, '识别文字过长，请分成短句录制') }
      const detected = Array.isArray(result.phrases) ? [...new Set<string>(result.phrases.map((phrase: { locale?: unknown }) => typeof phrase.locale === 'string' ? phrase.locale : '').filter(Boolean))] : []
      await completeSpeechRecording(recordingId, 'success', text.trim(), detected, null)
      recordingId = null
      return Response.json({ text: text.trim() }, { headers: { 'Cache-Control': 'no-store' } })
    }
    catch (error) {
      if (controller.signal.aborted) { throw new AccessError(504, '语音识别已取消或超时，请重试') }
      throw error
    }
    finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort) }
  }
  catch (error) {
    if (recordingId) {
      try {
        await completeSpeechRecording(recordingId, request.signal.aborted ? 'cancelled' : 'failed', null, [], error instanceof AccessError ? error.message.slice(0, 500) : '语音服务暂时不可用')
      }
      catch { return accessResponse(new AccessError(503, '录音状态保存失败，请稍后重试')) }
    }
    return accessResponse(error)
  }
  finally { if (acquired) { inFlight-- } }
}
