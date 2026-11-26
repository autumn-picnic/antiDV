import 'server-only'
import { randomUUID } from 'node:crypto'
import { feedbackDatabase } from './database'
import type { Actor } from '@/lib/auth/policy'
import type { DataOwner } from './data-owner'
import { assertAdmin } from '@/lib/auth/policy'

export interface ContactInput { message: string, name: string, phone: string, wechat: string, email: string }

function optionalText(value: string) { return value.trim() || null }

export async function createContact(input: ContactInput, owner: DataOwner | null = null) {
    const result = await feedbackDatabase().query(`
      INSERT INTO xiaoan_contact_feedback ("id", "createdAt", "message", "name", "phone", "wechat", "email", owner_kind, owner_ref, expires_at)
      VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8, now() + interval '180 days')
      RETURNING "id", "createdAt", "message", "name", "phone", "wechat", "email"`, [
        randomUUID(), input.message.trim(), optionalText(input.name), optionalText(input.phone),
        optionalText(input.wechat), optionalText(input.email), owner?.kind ?? null, owner?.ref ?? null,
    ])
    return result.rows[0]
}

export async function listContacts(actor: Actor, offset: number) {
    assertAdmin(actor)
    const client = await feedbackDatabase().connect()
    try {
        await client.query('BEGIN')
        const result = await client.query(`
      SELECT "id", "createdAt", "message", "name", "phone", "wechat", "email"
      FROM xiaoan_contact_feedback ORDER BY "createdAt" DESC, "id" DESC LIMIT 51 OFFSET $1`, [offset])
        await client.query('INSERT INTO xiaoan_contact_admin_access(clerk_user_id) VALUES ($1)', [actor.userId])
        await client.query('COMMIT')
        return { items: result.rows.slice(0, 50), nextOffset: result.rows.length > 50 ? offset + 50 : null }
    }
    catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
}
