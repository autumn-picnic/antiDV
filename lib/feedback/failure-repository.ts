import 'server-only'
import { feedbackDatabase } from './database'
import type { FailureInput } from './failure-validation'
import type { Actor } from '@/lib/auth/policy'
import { assertAdmin } from '@/lib/auth/policy'

export async function saveFailure(actor: Actor | null, failure: FailureInput, guestHash: string | null = null) {
  await feedbackDatabase().query(`
    INSERT INTO xiaoan_chat_failures(id, clerk_user_id, conversation_id, response_id, question, stage, status, reason, code, guest_hash, expires_at, owned_conversation_id)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now() + interval '30 days', (
      SELECT c.id FROM account_conversations c LEFT JOIN app_users u ON u.id=c.user_id
      WHERE c.id=$3 AND (($2 IS NOT NULL AND u.clerk_user_id=$2 AND u.status='active')
        OR ($2 IS NULL AND c.user_id IS NULL AND c.guest_hash=$10 AND c.expires_at>extract(epoch from now())))
    )
    ON CONFLICT (id) DO NOTHING`, [failure.id, actor?.userId ?? null, failure.conversationId, failure.responseId,
    failure.question, failure.stage, failure.status, failure.reason, failure.code, actor ? null : guestHash])
}

export async function listFailures(actor: Actor, offset: number) {
  assertAdmin(actor)
  const client = await feedbackDatabase().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`
      SELECT f.id, f.clerk_user_id AS "userId", f.conversation_id AS "conversationId", f.response_id AS "responseId",
        '[未生成去标识化文本]' AS question, f.stage, f.status,
        '请求未完成' AS comment, f.code, f.created_at AS "createdAt"
      FROM xiaoan_chat_failures f
      LEFT JOIN account_conversations c ON c.id=f.conversation_id
      LEFT JOIN app_users u ON u.id=c.user_id
      WHERE EXISTS (
        SELECT 1 FROM xiaoan_analysis_consent ac JOIN app_users owner ON owner.clerk_user_id=ac.clerk_user_id
        WHERE ac.clerk_user_id=f.clerk_user_id AND ac.granted=true AND owner.status='active'
          AND f.created_at>=ac.decided_at
          AND (f.conversation_id IS NULL OR c.created_at>=extract(epoch from ac.decided_at))
      ) OR EXISTS (
        SELECT 1 FROM xiaoan_conversation_analysis_consent cc
        JOIN xiaoan_analysis_consent ac ON ac.clerk_user_id=cc.clerk_user_id
        WHERE cc.conversation_id=c.id AND cc.granted=true AND ac.granted=true
          AND ((c.user_id IS NULL AND c.expires_at>extract(epoch from now()))
            OR (u.clerk_user_id=cc.clerk_user_id AND u.status='active'))
      ) OR EXISTS (SELECT 1 FROM xiaoan_prelaunch_failures h
        WHERE h.failure_id=f.id AND f.created_at<to_timestamp(1795540356)) ORDER BY f.created_at DESC, f.id DESC LIMIT 51 OFFSET $1`, [offset])
    await client.query('INSERT INTO xiaoan_failure_admin_access(clerk_user_id) VALUES ($1)', [actor.userId])
    await client.query('COMMIT')
    return { items: result.rows.slice(0, 50), nextOffset: result.rows.length > 50 ? offset + 50 : null }
  }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
