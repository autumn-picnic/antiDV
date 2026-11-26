import 'server-only'
import { feedbackDatabase } from './database'
import type { DataOwner } from './data-owner'

const tables = {
  contact: { table: 'xiaoan_contact_feedback', date: '"createdAt"', summary: 'left(message, 40) AS preview' },
  failures: { table: 'xiaoan_chat_failures', date: 'created_at', summary: 'left(question, 40) AS preview, status' },
  recordings: { table: 'xiaoan_speech_recordings', date: 'created_at', summary: 'duration_ms AS "durationMs", status' },
}
export type DataKind = keyof typeof tables
export const dataKinds = Object.keys(tables) as DataKind[]

function ownerFilter(kind: DataKind, owner: DataOwner) {
  if (kind === 'contact') { return { where: 'owner_kind=$1 AND owner_ref=$2', values: [owner.kind, owner.ref] } }
  return { where: owner.kind === 'user' ? 'clerk_user_id=$1' : 'clerk_user_id IS NULL AND guest_hash=$1', values: [owner.ref] }
}

export async function summarizeData(owner: DataOwner | null) {
  return Object.fromEntries(await Promise.all(dataKinds.map(async kind => {
    if (!owner) { return [kind, { count: 0, oldest: null, newest: null }] }
    const { table, date } = tables[kind]
    const { where, values } = ownerFilter(kind, owner)
    const result = await feedbackDatabase().query(`SELECT count(*)::int AS count, min(${date}) AS oldest, max(${date}) AS newest
      FROM ${table} WHERE ${where}`, values)
    return [kind, result.rows[0]]
  })))
}

export async function listData(kind: DataKind, owner: DataOwner, offset: number) {
  const { table, date, summary } = tables[kind]
  const { where, values } = ownerFilter(kind, owner)
  const result = await feedbackDatabase().query(`SELECT id, ${date} AS "createdAt", ${summary}
    FROM ${table} WHERE ${where} ORDER BY ${date} DESC, id DESC LIMIT 26 OFFSET $${values.length + 1}`, [...values, offset])
  return { items: result.rows.slice(0, 25), nextOffset: result.rows.length > 25 ? offset + 25 : null }
}

export async function deleteData(kind: DataKind, owner: DataOwner, id?: string) {
  const { table } = tables[kind]
  const { where, values } = ownerFilter(kind, owner)
  const byId = id ? ` AND id=$${values.push(id)}` : ''
  const result = await feedbackDatabase().query(`DELETE FROM ${table} WHERE ${where}${byId}`, values)
  return result.rowCount ?? 0
}
