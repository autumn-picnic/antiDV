import { AccessError } from '@/lib/auth/policy'
import { validateId } from './validation'

export interface FailureInput {
  id: string
  conversationId: string | null
  responseId: string | null
  question: string
  stage: 'create_conversation' | 'generate_response'
  status: number
  reason: string
  code: string | null
}

export function validateFailure(value: unknown): FailureInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new AccessError(400, '失败记录格式无效') }
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !['id', 'conversationId', 'responseId', 'question', 'stage', 'status', 'reason', 'code'].includes(key))) {
    throw new AccessError(400, '失败记录包含不支持的字段')
  }
  const id = validateId(data.id)
  const conversationId = data.conversationId == null ? null : validateId(data.conversationId)
  const responseId = data.responseId == null ? null : validateId(data.responseId)
  if (typeof data.question !== 'string' || !data.question.trim() || Array.from(data.question).length > 4000
    || typeof data.reason !== 'string' || !data.reason.trim() || Array.from(data.reason).length > 500
    || typeof data.stage !== 'string' || !['create_conversation', 'generate_response'].includes(data.stage)
    || typeof data.status !== 'number' || !Number.isInteger(data.status) || (data.status !== 0 && (data.status < 400 || data.status > 599))
    || (data.code != null && (typeof data.code !== 'string' || !/^[a-z_]{1,64}$/.test(data.code)))) {
    throw new AccessError(400, '失败记录内容无效')
  }
  return { id, conversationId, responseId, question: data.question, stage: data.stage as FailureInput['stage'], status: data.status, reason: data.reason, code: (data.code as string | null) ?? null }
}
