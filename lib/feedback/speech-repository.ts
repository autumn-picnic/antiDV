import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { feedbackDatabase } from './database'
import type { Actor } from '@/lib/auth/policy'
import { assertAdmin } from '@/lib/auth/policy'

export async function saveSpeechRecording(actor: Actor | null, audio: Uint8Array) {
  const id = randomUUID()
  await feedbackDatabase().query(`INSERT INTO xiaoan_speech_recordings
    (id, clerk_user_id, audio, sha256, duration_ms) VALUES ($1,$2,$3,$4,$5)`,
  [id, actor?.userId ?? null, Buffer.from(audio), createHash('sha256').update(audio).digest('hex'), Math.floor((audio.length - 44) / 32)])
  return id
}

export async function completeSpeechRecording(id: string, status: 'success' | 'failed' | 'cancelled', transcript: string | null, locales: string[], error: string | null) {
  await feedbackDatabase().query(`UPDATE xiaoan_speech_recordings SET status=$2, transcript=$3,
    detected_locales=$4, error_message=$5, completed_at=now() WHERE id=$1`, [id, status, transcript, locales, error])
}

export async function listSpeechRecordings(actor: Actor, offset: number) {
  assertAdmin(actor)
  const client = await feedbackDatabase().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`SELECT id, clerk_user_id AS "userId", duration_ms AS "durationMs",
      octet_length(audio) AS "byteLength", sha256, status, transcript, detected_locales AS locales,
      error_message AS "errorMessage", created_at AS "createdAt", completed_at AS "completedAt"
      FROM xiaoan_speech_recordings ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET $1`, [offset])
    await client.query('INSERT INTO xiaoan_speech_admin_access(clerk_user_id, action) VALUES ($1, $2)', [actor.userId, 'list'])
    await client.query('COMMIT')
    return { items: result.rows.slice(0, 50), nextOffset: result.rows.length > 50 ? offset + 50 : null }
  }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}

export async function readSpeechAudio(actor: Actor, id: string): Promise<Buffer | null> {
  assertAdmin(actor)
  const client = await feedbackDatabase().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query('SELECT audio FROM xiaoan_speech_recordings WHERE id=$1', [id])
    if (result.rows.length) {
      await client.query('INSERT INTO xiaoan_speech_admin_access(clerk_user_id, recording_id, action) VALUES ($1,$2,$3)', [actor.userId, id, 'play'])
    }
    await client.query('COMMIT')
    return result.rows[0]?.audio ?? null
  }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
