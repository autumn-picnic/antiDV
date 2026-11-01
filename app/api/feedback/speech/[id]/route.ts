import { requireActor } from '@/lib/auth/server'
import { AccessError, accessResponse } from '@/lib/auth/policy'
import { readSpeechAudio } from '@/lib/feedback/speech-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(true)
    const { id } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) { throw new AccessError(400, '录音编号无效') }
    const audio = await readSpeechAudio(actor, id)
    if (!audio) { throw new AccessError(404, '录音不存在') }
    const headers: Record<string, string> = {
      'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${id}.wav"`, 'X-Content-Type-Options': 'nosniff',
    }
    const range = request.headers.get('range')
    let start = 0; let end = audio.length - 1
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (!match || (!match[1] && !match[2])) { return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${audio.length}` } }) }
      if (!match[1]) { start = Math.max(0, audio.length - Number(match[2])) }
      else { start = Number(match[1]); end = match[2] ? Math.min(end, Number(match[2])) : end }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= audio.length) {
        return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${audio.length}` } })
      }
      headers['Content-Range'] = `bytes ${start}-${end}/${audio.length}`
    }
    const body = new Uint8Array(audio.subarray(start, end + 1))
    headers['Content-Length'] = String(body.length)
    return new Response(body, { status: range ? 206 : 200, headers })
  }
  catch (error) { return accessResponse(error) }
}
