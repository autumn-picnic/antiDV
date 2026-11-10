import 'server-only'
import { feedbackDatabase } from './database'
import type { ReviewInput } from './validation'
import type { Actor } from '@/lib/auth/policy'
import { AccessError, assertAdmin } from '@/lib/auth/policy'

export async function saveReview(actor: Actor, review: ReviewInput) {
  // Ownership is checked in the write statement, never from client-supplied identity/chat text.
  const result = await feedbackDatabase().query(`
    INSERT INTO xiaoan_answer_feedback(response_id, clerk_user_id, score, comment)
    SELECT t.response_id, u.clerk_user_id, $4, $5
    FROM account_turns t JOIN account_conversations c ON c.id=t.conversation_id
    JOIN app_users u ON u.id=c.user_id
    WHERE c.id=$1 AND t.response_id=$2 AND u.clerk_user_id=$3 AND u.status='active'
    ON CONFLICT (response_id) DO UPDATE SET score=EXCLUDED.score, comment=EXCLUDED.comment, updated_at=now()
    WHERE xiaoan_answer_feedback.clerk_user_id=EXCLUDED.clerk_user_id
    RETURNING response_id AS "responseId", score, comment`, [review.conversationId, review.responseId, actor.userId, review.score, review.comment])
  if (!result.rows.length) { throw new AccessError(404, '回答不存在或不可访问') }
  return result.rows[0]
}

export async function ownReviews(actor: Actor, conversationId: string) {
  const result = await feedbackDatabase().query(`
    SELECT f.response_id AS "responseId", f.score, f.comment
    FROM xiaoan_answer_feedback f JOIN account_turns t ON t.response_id=f.response_id
    JOIN account_conversations c ON c.id=t.conversation_id JOIN app_users u ON u.id=c.user_id
    WHERE c.id=$1 AND u.clerk_user_id=$2 AND u.status='active' AND f.clerk_user_id=$2`, [conversationId, actor.userId])
  return result.rows
}

export async function adminConversations(actor: Actor, offset: number, conversationId?: string) {
  assertAdmin(actor)
  const client = await feedbackDatabase().connect()
  try {
    await client.query('BEGIN')
    // Admin-only diagnostics; read audit is committed before returning data.
    const result = conversationId
      ? await client.query(`
          SELECT t.number, t.response_id AS "responseId",
            CASE WHEN t.content->>'status' = 'failed'
              THEN COALESCE(t.content->>'user_original', t.content->>'user', '')
              ELSE t.content->>'user'
            END AS question,
            t.content->>'assistant' AS answer, t.content->>'safety_level' AS "safetyLevel",
            t.content->'debug' AS debug,
            t.content->>'reasoning' AS reasoning,
            t.content->'request_context' AS "requestContext",
            f.score, f.comment, f.updated_at AS "reviewedAt"
          FROM account_turns t JOIN account_conversations c ON c.id=t.conversation_id
          LEFT JOIN app_users u ON u.id=c.user_id
          LEFT JOIN xiaoan_answer_feedback f ON f.response_id=t.response_id
          WHERE c.id=$1 AND (u.status='active' OR (c.user_id IS NULL AND c.expires_at>extract(epoch from now())))
          ORDER BY t.number LIMIT 51 OFFSET $2`, [conversationId, offset])
      : await client.query(`
          SELECT c.id, u.clerk_user_id AS "userId", c.created_at AS "createdAt",
            count(t.response_id)::int AS "turnCount", count(f.response_id)::int AS "reviewCount"
          FROM account_conversations c LEFT JOIN app_users u ON u.id=c.user_id
          LEFT JOIN account_turns t ON t.conversation_id=c.id
          LEFT JOIN xiaoan_answer_feedback f ON f.response_id=t.response_id
          WHERE u.status='active' OR (c.user_id IS NULL AND c.expires_at>extract(epoch from now()))
          GROUP BY c.id, u.clerk_user_id ORDER BY c.created_at DESC, c.id LIMIT 51 OFFSET $1`, [offset])
    await client.query('INSERT INTO xiaoan_admin_access(clerk_user_id, action, conversation_id) VALUES ($1,$2,$3)', [actor.userId, conversationId ? 'read_conversation' : 'list_conversations', conversationId || null])
    await client.query('COMMIT')
    return { items: result.rows.slice(0, 50), nextOffset: result.rows.length > 50 ? offset + 50 : null }
  }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
