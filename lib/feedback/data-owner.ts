import 'server-only'
import { createHash } from 'node:crypto'
import { optionalActor } from '@/lib/auth/server'
import type { NextRequest } from 'next/server'

export interface DataOwner { kind: 'user' | 'guest', ref: string }

export function guestCredentialHash(request: NextRequest) {
  const token = request.cookies?.get('xiaoan_guest')?.value
  return token && /^[A-Za-z0-9_-]{32,128}$/.test(token) ? createHash('sha256').update(token).digest('hex') : null
}

export async function dataOwner(request: NextRequest): Promise<DataOwner | null> {
  const actor = await optionalActor()
  if (actor) { return { kind: 'user', ref: actor.userId } }
  const ref = guestCredentialHash(request)
  return ref ? { kind: 'guest', ref } : null
}
