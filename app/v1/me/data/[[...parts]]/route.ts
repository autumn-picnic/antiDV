import type { NextRequest } from 'next/server'
import { AccessError, accessResponse, assertSameOrigin } from '@/lib/auth/policy'
import { dataOwner } from '@/lib/feedback/data-owner'
import { dataKinds, deleteData, listData, summarizeData, type DataKind } from '@/lib/feedback/data-repository'
import { pageOffset } from '@/lib/feedback/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ parts?: string[] }> }
const headers = { 'Cache-Control': 'no-store' }

async function parsePath(context: Context) {
  const { parts = [] } = await context.params
  const [kind, id] = parts
  if (parts.length > 2 || (kind && !dataKinds.includes(kind as DataKind))
    || (id && !(kind === 'recordings'
      ? /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)
      : /^[A-Za-z0-9_-]{1,128}$/.test(id)))) {
    throw new AccessError(404, '记录不存在')
  }
  return { kind: kind as DataKind | undefined, id }
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { kind, id } = await parsePath(context)
    if (id) { throw new AccessError(404, '记录不存在') }
    const owner = await dataOwner(request)
    const result = kind
      ? owner ? await listData(kind, owner, pageOffset(request.nextUrl.searchParams.get('offset'))) : { items: [], nextOffset: null }
      : await summarizeData(owner)
    return Response.json(result, { headers })
  }
  catch (error) { return accessResponse(error) }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request)
    const { kind, id } = await parsePath(context)
    const owner = await dataOwner(request)
    if (!kind || !owner) { throw new AccessError(404, '记录不存在') }
    if (!id) {
      const text = await request.text()
      if (text.length > 128) { throw new AccessError(413, '请求内容过长') }
      let body
      try { body = JSON.parse(text) }
      catch { throw new AccessError(422, '请确认删除这类记录') }
      if (!body || body.confirmation !== 'DELETE' || Object.keys(body).length !== 1) {
        throw new AccessError(422, '请确认删除这类记录')
      }
    }
    const deleted = await deleteData(kind, owner, id)
    if (id && !deleted) { throw new AccessError(404, '记录不存在') }
    return Response.json({ deleted }, { headers })
  }
  catch (error) { return accessResponse(error) }
}
