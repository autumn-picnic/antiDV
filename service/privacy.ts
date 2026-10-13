import { ChatApiError } from '@/service/index'
import type { ConsentChange, ConversationPolicy, PrivacyField, PrivacyOptions, PrivacyStatus, RetentionChange } from '@/types/privacy'

async function privacyRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`/v1${path}`, { ...init, credentials: 'include', cache: 'no-store' })
  if (response.status === 202) {
    await response.body?.cancel()
    throw new ChatApiError(202, '变更已提交，恢复保护记录仍在同步。请稍后刷新状态；目前尚未确认完成。')
  }
  if (!response.ok) {
    await response.body?.cancel()
    const message = response.status === 409
      ? '设置已在其他请求中更新，请刷新状态后重新选择'
      : response.status === 401
        ? '请先登录，再管理个人信息授权'
        : response.status === 422
          ? '设置未保存，请检查填写的内容和期限'
          : '隐私设置暂时无法读取或保存，你仍可继续聊天'
    throw new ChatApiError(response.status, message)
  }
  return response.json()
}
function validPolicy(data: ConversationPolicy): ConversationPolicy {
  if (!data || !['history', 'rolling', 'ephemeral'].includes(data.mode)
    || (data.expires_at !== null && (typeof data.expires_at !== 'number' || !Number.isFinite(data.expires_at)))
    || !Number.isInteger(data.policy_version) || data.policy_version < 0
    || (data.mode !== 'ephemeral' && (!Number.isInteger(data.retention_days) || data.retention_days! < 1 || data.retention_days! > 90))) {
    throw new ChatApiError(502, '保存策略返回格式无效，请刷新状态')
  }
  return data
}
function validStatus(data: PrivacyStatus): PrivacyStatus {
  if (!data || typeof data.available !== 'boolean'
    || ['region', 'nickname', 'preferences'].some((field) => {
      const status = data.fields?.[field as PrivacyField]
      return !status || (status.expires_at !== null && (typeof status.expires_at !== 'number' || !Number.isFinite(status.expires_at))) || typeof status.allowed !== 'boolean' || !Number.isInteger(status.version) || status.version < 0
    })) { throw new ChatApiError(502, '授权状态返回格式无效，请刷新状态') }
  return data
}
export async function fetchPrivacyOptions(signal?: AbortSignal): Promise<PrivacyOptions> {
  const data = await privacyRequest('/privacy/options', { signal })
  if (!data || !Array.isArray(data.fields) || !Array.isArray(data.city_codes) || data.city_codes.some((code: unknown) => typeof code !== 'string' || !/^\d{6}$/.test(code)) || !data.provinces
    || !Number.isInteger(data.default_retention_days) || !Number.isInteger(data.max_retention_days)
    || data.max_retention_days < 1 || data.max_retention_days > 90
    || data.default_retention_days < 1 || data.default_retention_days > data.max_retention_days) {
    throw new ChatApiError(502, '隐私选项返回格式无效，请刷新状态')
  }
  return data
}
export async function fetchPrivacyStatus(signal?: AbortSignal): Promise<PrivacyStatus> {
  return validStatus(await privacyRequest('/me/privacy', { signal }))
}
export async function changeConsent(field: PrivacyField, body: ConsentChange, signal?: AbortSignal): Promise<PrivacyStatus> {
  return validStatus(await privacyRequest(`/me/privacy/${field}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }))
}
export async function fetchConversationPolicy(id: string, signal?: AbortSignal): Promise<ConversationPolicy> {
  return validPolicy(await privacyRequest(`/conversations/${encodeURIComponent(id)}/policy`, { signal }))
}
export async function changeConversationPolicy(id: string, body: RetentionChange, signal?: AbortSignal): Promise<ConversationPolicy> {
  return validPolicy(await privacyRequest(`/conversations/${encodeURIComponent(id)}/policy`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }))
}
export function retentionNotice(policy: ConversationPolicy | null): string {
  if (!policy) { return '保存期限正在确认；可在「隐私与保存」中查看。' }
  if (policy.mode === 'ephemeral') { return '不保存新的聊天历史；临时上下文闲置24小时后清除，服务重启可能丢失。' }
  if (policy.mode === 'rolling') { return `整段对话从最后一轮成功回答起保留${policy.retention_days}天。` }
  return `每轮成功完成的对话分别保留${policy.retention_days}天。` }
export function expiryText(timestamp: number | null): string {
  return timestamp == null ? '暂无到期时间' : new Date(timestamp * 1000).toLocaleString('zh-CN', { hour12: false })
}
