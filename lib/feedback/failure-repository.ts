import 'server-only'
import { feedbackDatabase } from './database'
import type { FailureInput } from './failure-validation'
import type { Actor } from '@/lib/auth/policy'
import { assertAdmin } from '@/lib/auth/policy'

export async function saveFailure(actor: Actor | null, failure: FailureInput) {
  await feedbackDatabase().query(`
    INSERT INTO xiaoan_chat_failures(id, clerk_user_id, conversation_id, response_id, question, stage, status, reason, code)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (id) DO NOTHING`, [failure.id, actor?.userId ?? null, failure.conversationId, failure.responseId,
    failure.question, failure.stage, failure.status, failure.reason, failure.code])
}

export async function listFailures(actor: Actor, offset: number) {
  assertAdmin(actor)
  const client = await feedbackDatabase().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`
      SELECT id, clerk_user_id AS "userId", conversation_id AS "conversationId", response_id AS "responseId",
        question, stage, status, reason AS comment, code, created_at AS "createdAt"
      FROM xiaoan_chat_failures ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET $1`, [offset])
    await client.query('INSERT INTO xiaoan_failure_admin_access(clerk_user_id) VALUES ($1)', [actor.userId])
    await client.query('COMMIT')
    return { items: result.rows.slice(0, 50), nextOffset: result.rows.length > 50 ? offset + 50 : null }
  }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
