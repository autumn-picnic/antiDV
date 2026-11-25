import 'server-only'
import { randomUUID } from 'node:crypto'
import { feedbackDatabase } from '@/lib/feedback/database'
import { DEFAULT_TITLE_MODEL, generateConversationTitle, validTitle } from './model'

// Resolve a backend-authorized source again in SQL. Never read user_original or debug.
const liveSource = `SELECT t.response_id, t.content->>'user' AS message
  FROM account_turns t JOIN account_conversations c ON c.id=t.conversation_id
  JOIN conversation_turn_retention r ON r.response_id=t.response_id
  JOIN conversation_privacy_policies p ON p.conversation_id=c.id
  WHERE c.id=$1 AND t.response_id=$2 AND r.expires_at>extract(epoch from now())
    AND p.mode<>'ephemeral' AND (c.expires_at IS NULL OR c.expires_at>extract(epoch from now()))
    AND NOT EXISTS (SELECT 1 FROM account_turns earlier
      JOIN conversation_turn_retention er ON er.response_id=earlier.response_id
      WHERE earlier.conversation_id=c.id AND earlier.number<t.number
        AND er.expires_at>extract(epoch from now()))`

export async function conversationTitle(id: string, responseId: string, generate: boolean) {
  const db = feedbackDatabase()
  const source = (await db.query(liveSource, [id, responseId])).rows[0]
  if (!source || typeof source.message !== 'string' || !source.message.trim()) { return { title: null, status: 'unavailable' } }
  const stored = (await db.query(`SELECT title, status FROM xiaoan_conversation_titles WHERE conversation_id=$1 AND response_id=$2 AND EXISTS (${liveSource})`, [id, responseId])).rows[0]
  if (stored?.status === 'complete' && validTitle(stored.title)) { return { title: stored.title, status: 'complete' } }
  if (!generate || stored?.status === 'fallback') { return { title: null, status: stored?.status || 'missing' } }
  const lease = randomUUID()
  const model = process.env.CHAT_TITLE_MODEL?.trim() || DEFAULT_TITLE_MODEL
  const claim = await db.query(`INSERT INTO xiaoan_conversation_titles
      (conversation_id,response_id,title,status,lease_id,lease_until,model)
    SELECT $1, response_id, NULL, 'pending', $3, now()+interval '30 seconds', $4 FROM (${liveSource}) live
    ON CONFLICT (conversation_id) DO UPDATE SET lease_id=$3, lease_until=now()+interval '30 seconds',
      attempts=xiaoan_conversation_titles.attempts+1, model=$4, updated_at=now()
    WHERE xiaoan_conversation_titles.response_id=$2 AND xiaoan_conversation_titles.status='pending'
      AND xiaoan_conversation_titles.lease_until<now() AND xiaoan_conversation_titles.attempts<2
    RETURNING response_id`, [id, responseId, lease, model])
  if (!claim.rows.length) { return { title: null, status: 'pending' } }
  let title: string | null = null
  try { title = await generateConversationTitle(source.message) }
  catch { /* Persist the fallback decision without provider errors or sensitive input. */ }
  // Recheck retention and source after generation. Deletion cannot recreate a row.
  const saved = await db.query(`UPDATE xiaoan_conversation_titles SET title=$4, status=$5, updated_at=now()
    WHERE conversation_id=$1 AND response_id=$2 AND lease_id=$3
      AND EXISTS (${liveSource}) RETURNING title, status`, [id, responseId, lease, title, title ? 'complete' : 'fallback'])
  return saved.rows[0] || { title: null, status: 'unavailable' }
}
