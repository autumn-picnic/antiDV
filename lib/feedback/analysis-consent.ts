import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { feedbackDatabase } from './database'
import { AccessError } from '@/lib/auth/policy'
import type { Actor } from '@/lib/auth/policy'
import { ANALYSIS_CONSENT_VERSION } from '@/lib/privacy/analysis-consent'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')

export async function prepareAnalysisConsent(granted: boolean, conversationId: string | null, guestToken?: string) {
  const token = randomBytes(32).toString('hex')
  // The guest credential is HttpOnly and path=/v1. Match the backend's SHA-256
  // ownership check; a client-supplied conversation ID is never sufficient.
  const result = await feedbackDatabase().query(`
    INSERT INTO xiaoan_analysis_intents(token_hash, granted, version, guest_conversation_id)
    SELECT $1, $2, $3, $4::varchar
    WHERE $4::varchar IS NULL OR EXISTS (
      SELECT 1 FROM account_conversations c
      WHERE c.id=$4 AND c.user_id IS NULL AND c.guest_hash=$5
        AND c.expires_at>extract(epoch from now())
    ) RETURNING token_hash`, [digest(token), granted, ANALYSIS_CONSENT_VERSION, conversationId, guestToken ? digest(guestToken) : null])
  if (!result.rows.length) { throw new AccessError(404, '游客对话已失效，请刷新后重试') }
  return token
}

export async function completeAnalysisConsent(actor: Actor, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) { throw new AccessError(400, '授权记录无效，请重新选择') }
  const client = await feedbackDatabase().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`SELECT * FROM xiaoan_analysis_intents
      WHERE token_hash=$1 AND expires_at>now() FOR UPDATE`, [digest(token)])
    const intent = result.rows[0]
    if (!intent) { throw new AccessError(410, '授权选择已过期，当前未启用此次授权') }
    if (intent.consumed_by && intent.consumed_by !== actor.userId) { throw new AccessError(403, '授权记录不属于当前账号') }
    if (!intent.consumed_by) {
      const saved = await client.query(`
        INSERT INTO xiaoan_analysis_consent(clerk_user_id, granted, version, decided_at)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (clerk_user_id) DO UPDATE SET granted=EXCLUDED.granted,
          version=EXCLUDED.version, decided_at=EXCLUDED.decided_at, updated_at=now()
        WHERE xiaoan_analysis_consent.decided_at<=EXCLUDED.decided_at
        RETURNING clerk_user_id`, [actor.userId, intent.granted, intent.version, intent.created_at])
      if (saved.rows.length && intent.granted) {
        await client.query(`INSERT INTO xiaoan_analysis_consent_events(clerk_user_id, action, version)
          VALUES ($1, 'grant', $2)`, [actor.userId, intent.version])
      }
      if (saved.rows.length && intent.guest_conversation_id) {
        await client.query(`
          INSERT INTO xiaoan_conversation_analysis_consent(conversation_id, clerk_user_id, granted, version, decided_at)
          SELECT c.id, $2, $3, $4, $5 FROM account_conversations c
          LEFT JOIN app_users u ON u.id=c.user_id
          WHERE c.id=$1 AND ((c.user_id IS NULL AND c.expires_at>extract(epoch from now()))
            OR (u.clerk_user_id=$2 AND u.status='active'))
          AND NOT ($3 AND EXISTS (
            SELECT 1 FROM xiaoan_analysis_consent_events
            WHERE clerk_user_id=$2 AND action='withdraw'
          ))
          ON CONFLICT (conversation_id) DO UPDATE SET clerk_user_id=EXCLUDED.clerk_user_id,
            granted=EXCLUDED.granted, version=EXCLUDED.version, decided_at=EXCLUDED.decided_at
          WHERE xiaoan_conversation_analysis_consent.decided_at<=EXCLUDED.decided_at`,
        [intent.guest_conversation_id, actor.userId, intent.granted, intent.version, intent.created_at])
      }
      await client.query('UPDATE xiaoan_analysis_intents SET consumed_by=$2, consumed_at=now() WHERE token_hash=$1', [digest(token), actor.userId])
    }
    await client.query('COMMIT')
  }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}

export async function analysisConsentStatus(actor: Actor) {
  const result = await feedbackDatabase().query(`
    SELECT granted, decided_at AS "decidedAt", version
    FROM xiaoan_analysis_consent WHERE clerk_user_id=$1`, [actor.userId])
  return result.rows[0] ?? { granted: false, decidedAt: null, version: null }
}

export async function withdrawAnalysisConsent(actor: Actor) {
  const client = await feedbackDatabase().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`
      INSERT INTO xiaoan_analysis_consent(clerk_user_id, granted, version, decided_at)
      VALUES ($1, false, $2, clock_timestamp())
      ON CONFLICT (clerk_user_id) DO UPDATE SET granted=false,
        version=EXCLUDED.version, decided_at=clock_timestamp(), updated_at=clock_timestamp()
      RETURNING granted, decided_at AS "decidedAt", version`, [actor.userId, ANALYSIS_CONSENT_VERSION])
    await client.query(`UPDATE xiaoan_conversation_analysis_consent
      SET granted=false, decided_at=$2 WHERE clerk_user_id=$1 AND granted=true`,
    [actor.userId, result.rows[0].decidedAt])
    await client.query(`INSERT INTO xiaoan_analysis_consent_events(clerk_user_id, action, version)
      VALUES ($1, 'withdraw', $2)`, [actor.userId, ANALYSIS_CONSENT_VERSION])
    await client.query('COMMIT')
    return result.rows[0]
  }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
