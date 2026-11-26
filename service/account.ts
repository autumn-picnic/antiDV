export type DeletionStatus = 'active' | 'deleting' | 'deleted'

async function deletionStatus(response: Response): Promise<DeletionStatus> {
  if (response.status !== 200 && response.status !== 202) { throw new Error('Deletion status unavailable') }
  const { status } = await response.json()
  if (status !== 'active' && status !== 'deleting' && status !== 'deleted') { throw new Error('Invalid deletion status') }
  return status
}

export async function requestAccountDeletion(signal?: AbortSignal) {
  return deletionStatus(await fetch('/v1/me', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation: 'DELETE' }), cache: 'no-store', signal,
  }))
}

export async function fetchDeletionStatus(signal?: AbortSignal) {
  return deletionStatus(await fetch('/v1/me/deletion', { cache: 'no-store', signal }))
}
