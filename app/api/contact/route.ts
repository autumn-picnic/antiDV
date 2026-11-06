import type { NextRequest } from 'next/server'
import { requireActor } from '@/lib/auth/server'
import { AccessError, accessResponse, assertSameOrigin } from '@/lib/auth/policy'
import { createContact, listContacts } from '@/lib/feedback/contact-repository'
import { pageOffset } from '@/lib/feedback/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        assertSameOrigin(request)
        const text = await request.text()
        if (text.length > 20000) { throw new AccessError(413, '留言内容过长') }
        let body
        try { body = JSON.parse(text) }
        catch { throw new AccessError(400, '留言格式无效') }
        if (!body || typeof body !== 'object' || Array.isArray(body)) { throw new AccessError(400, '留言格式无效') }
        if (Object.keys(body).some(key => !['message', 'name', 'phone', 'wechat', 'email'].includes(key))) { throw new AccessError(400, '留言包含不支持的字段') }
        const { message, name, phone, wechat, email } = body
        if (typeof message !== 'string' || !message.trim()) { throw new AccessError(400, '留言内容不能为空') }
        if (Array.from(message.trim()).length > 2000) { throw new AccessError(400, '留言内容不超过 2000 字') }
        for (const [key, max] of Object.entries({ name: 50, phone: 20, wechat: 50, email: 100 })) {
            const value = body[key]
            if (value != null && (typeof value !== 'string' || Array.from(value.trim()).length > max)) { throw new AccessError(400, '联系方式格式或长度无效') }
        }
        const record = await createContact({
            message: message.trim(),
            name: typeof name === 'string' ? name : '',
            phone: typeof phone === 'string' ? phone : '',
            wechat: typeof wechat === 'string' ? wechat : '',
            email: typeof email === 'string' ? email : '',
        })
        return Response.json({ success: true, id: record.id }, { headers: { 'Cache-Control': 'no-store' } })
    }
    catch (error) { return accessResponse(error) }
}

export async function GET(request: NextRequest) {
    try {
        const actor = await requireActor(true)
        return Response.json(await listContacts(actor, pageOffset(request.nextUrl.searchParams.get('offset'))), { headers: { 'Cache-Control': 'no-store' } })
    }
    catch (error) { return accessResponse(error) }
}
