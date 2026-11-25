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

type AdminView = { conversationId: string } | { users: true } | { userId?: string }

export async function adminConversations(actor: Actor, offset: number, view: AdminView = {}) {
  assertAdmin(actor)
  const client = await feedbackDatabase().connect()
  try {
    await client.query('BEGIN')
    // Analysis consent applies to every list/detail/export query. Read audit is
    // committed before returning data. Only de-identified transcript fields are
    // selected: raw originals, debug prompts, reasoning and IP/location stay out.
    const conversationId = 'conversationId' in view ? view.conversationId : undefined
    const normal = `(u.status='active' OR (c.user_id IS NULL AND c.expires_at>extract(epoch from now())))
      AND (
        EXISTS (SELECT 1 FROM xiaoan_analysis_consent ac
          WHERE ac.clerk_user_id=u.clerk_user_id AND ac.granted=true
            AND c.created_at>=extract(epoch from ac.decided_at))
        OR EXISTS (SELECT 1 FROM xiaoan_conversation_analysis_consent cc
          JOIN xiaoan_analysis_consent ac ON ac.clerk_user_id=cc.clerk_user_id
          WHERE cc.conversation_id=c.id AND cc.granted=true AND ac.granted=true
            AND (c.user_id IS NULL OR u.clerk_user_id=cc.clerk_user_id))
      )`
    // Frozen inventory of internal tests, never a grant for future conversations.
    const historical = `EXISTS (SELECT 1 FROM xiaoan_prelaunch_feedback h
      WHERE h.conversation_id=c.id AND c.created_at<1795540356)`
    const visible = `((${normal}) OR ${historical})`
    const turnVisible = `((${normal}) OR EXISTS (
      SELECT 1 FROM xiaoan_prelaunch_feedback h WHERE h.conversation_id=c.id
        AND c.created_at<1795540356 AND t.number<=h.max_turn_number))`
    let result
    if (conversationId) {
      result = await client.query(`
          SELECT t.number, t.response_id AS "responseId",
            t.content->>'user' AS question,
            t.content->>'assistant' AS answer, t.content->>'safety_level' AS "safetyLevel",
            NULL AS debug, NULL AS reasoning,
            json_build_object(
              'started_at', t.content->'request_context'->'started_at',
              'completed_at', t.content->'request_context'->'completed_at'
            ) AS "requestContext",
            f.score, f.comment, f.updated_at AS "reviewedAt"
          FROM account_turns t JOIN account_conversations c ON c.id=t.conversation_id
          LEFT JOIN app_users u ON u.id=c.user_id
          LEFT JOIN xiaoan_answer_feedback f ON f.response_id=t.response_id
          WHERE c.id=$1 AND ${visible} AND ${turnVisible}
          ORDER BY t.number LIMIT 51 OFFSET $2`, [conversationId, offset])
    }
    else if ('users' in view) {
      result = await client.query(`
          SELECT u.clerk_user_id AS "userId", count(*)::int AS "conversationCount"
          FROM account_conversations c LEFT JOIN app_users u ON u.id=c.user_id
          WHERE ${visible}
          GROUP BY u.clerk_user_id
          ORDER BY max(c.created_at) DESC, u.clerk_user_id LIMIT 51 OFFSET $1`, [offset])
    }
    else {
      const userId = 'userId' in view ? view.userId : undefined
      const userFilter = userId === undefined ? '' : 'AND u.clerk_user_id IS NOT DISTINCT FROM NULLIF($2, \'\')'
      result = await client.query(`
          SELECT c.id, u.clerk_user_id AS "userId", c.created_at AS "createdAt",
            count(t.response_id)::int AS "turnCount", count(f.response_id)::int AS "reviewCount"
          FROM account_conversations c LEFT JOIN app_users u ON u.id=c.user_id
          LEFT JOIN account_turns t ON t.conversation_id=c.id AND ${turnVisible}
          LEFT JOIN xiaoan_answer_feedback f ON f.response_id=t.response_id
          WHERE ${visible} ${userFilter}
          GROUP BY c.id, u.clerk_user_id ORDER BY c.created_at DESC, c.id LIMIT 51 OFFSET $1`,
      userId === undefined ? [offset] : [offset, userId])
    }
    await client.query('INSERT INTO xiaoan_admin_access(clerk_user_id, action, conversation_id) VALUES ($1,$2,$3)', [actor.userId, conversationId ? 'read_conversation' : 'list_conversations', conversationId || null])
    await client.query('COMMIT')
    return { items: result.rows.slice(0, 50), nextOffset: result.rows.length > 50 ? offset + 50 : null }
  }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
