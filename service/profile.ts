import { ChatApiError } from '@/service'

export interface ProfileItem {
  id: string
  label?: string
  text?: string
  target?: string
  stance?: string
  names?: string[]
}

export interface Profile {
  enabled: boolean
  exists: boolean
  version: number
  people: ProfileItem[]
  notes: ProfileItem[]
  boundaries: ProfileItem[]
  outcomes: ProfileItem[]
}

export type ProfileAction = { action: 'set_enabled', enabled: boolean }
  | { action: 'clear' | 'export' }
  | { action: 'delete_item', item_id: string }
  | { action: 'delete_alias', item_id: string, alias_value: string }

async function requestProfile(signal: AbortSignal, body?: ProfileAction & { version: number }) {
  const response = await fetch(`/v1/me/memory/profile${body ? '/actions' : ''}`, {
    credentials: 'same-origin', cache: 'no-store', signal,
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    throw new ChatApiError(response.status, response.status === 409 ? '跨对话记忆设置已更新，请刷新后重试。' : '跨对话记忆暂时无法使用。')
  }
  return response.json()
}

export async function fetchProfile(signal: AbortSignal): Promise<Profile> {
  const data = await requestProfile(signal)
  if (!data || typeof data.enabled !== 'boolean' || typeof data.exists !== 'boolean'
    || !Number.isSafeInteger(data.version) || data.version < 0
    || !['people', 'notes', 'boundaries', 'outcomes'].every(key => Array.isArray(data[key])
      && data[key].every((item: ProfileItem) => item && typeof item.id === 'string'))) {
    throw new Error('跨对话记忆状态无法确认。')
  }
  return data
}

export async function changeProfile(signal: AbortSignal, version: number, action: ProfileAction) {
  const data = await requestProfile(signal, { ...action, version })
  if (!data || !Number.isSafeInteger(data.version)
    || (action.action === 'export' ? !data.export : data.status !== 'updated')) {
    throw new Error('跨对话记忆操作结果无法确认。')
  }
  return data
}
