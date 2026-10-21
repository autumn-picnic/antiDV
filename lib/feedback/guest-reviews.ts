import 'server-only'
import type { NextRequest } from 'next/server'
import { fetchBackend } from '@/lib/backend'
import { AccessError } from '@/lib/auth/policy'
import { feedbackDatabase } from './database'
import type { ReviewInput } from './validation'

/** The backend owns guest credential validation; never trust a conversation ID alone. */
export async function assertGuestConversation(request: NextRequest, conversationId: string) {
  const token = request.cookies.get('xiaoan_guest')?.value
  if (!token) { throw new AccessError(401, '游客会话已失效，请重新开始对话') }
  const response = await fetchBackend(`/v1/conversations/${encodeURIComponent(conversationId)}?limit=1`, {
    headers: { Cookie: `xiaoan_guest=${token}` }, signal: request.signal,
  })
  try {
    if (!response.ok) {
      throw new AccessError([401, 403, 404].includes(response.status) ? response.status : 503, '会话已过期或不可访问')
    }
    const data = await response.json()
    if (data.conversation_id !== conversationId) { throw new AccessError(503, '会话验证失败') }
  }
  finally { await response.body?.cancel().catch(() => {}) }
}

// Existing reviewer identity column stores guest:<conversation ID> for guest reviews.
// Backend credential validation MUST precede these queries; SQL also checks expiry/claim races.
export async function saveGuestReview(review: ReviewInput) {
  const result = await feedbackDatabase().query(`
    INSERT INTO xiaoan_answer_feedback(response_id, clerk_user_id, score, comment)
    SELECT t.response_id, $3, $4, $5
    FROM account_turns t JOIN account_conversations c ON c.id=t.conversation_id
    WHERE c.id=$1 AND t.response_id=$2 AND c.user_id IS NULL
      AND c.expires_at>extract(epoch from now())
    ON CONFLICT (response_id) DO UPDATE SET score=EXCLUDED.score, comment=EXCLUDED.comment, updated_at=now()
    WHERE xiaoan_answer_feedback.clerk_user_id=EXCLUDED.clerk_user_id
    RETURNING response_id AS "responseId", score, comment`, [review.conversationId, review.responseId, `guest:${review.conversationId}`, review.score, review.comment])
  if (!result.rows.length) { throw new AccessError(404, '回答不存在或不可访问') }
  return result.rows[0]
}

export async function guestReviews(conversationId: string) {
  const result = await feedbackDatabase().query(`
    SELECT f.response_id AS "responseId", f.score, f.comment
    FROM xiaoan_answer_feedback f JOIN account_turns t ON t.response_id=f.response_id
    JOIN account_conversations c ON c.id=t.conversation_id
    WHERE c.id=$1 AND c.user_id IS NULL AND c.expires_at>extract(epoch from now())
      AND f.clerk_user_id=$2`, [conversationId, `guest:${conversationId}`])
  return result.rows
}
