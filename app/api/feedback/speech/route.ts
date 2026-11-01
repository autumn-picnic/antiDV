import { requireActor } from '@/lib/auth/server'
import { accessResponse } from '@/lib/auth/policy'
import { listSpeechRecordings } from '@/lib/feedback/speech-repository'
import { pageOffset } from '@/lib/feedback/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const actor = await requireActor(true)
    return Response.json(await listSpeechRecordings(actor, pageOffset(new URL(request.url).searchParams.get('offset'))), { headers: { 'Cache-Control': 'no-store' } })
  }
  catch (error) { return accessResponse(error) }
}
