/** Native contract: xiaoan/tech/chatflow/poc/API.md (Azure account mode). */
export type SafetyLevel = 'normal' | 'unclear' | 'immediate_danger' | 'self_harm'
export type GuardStatus = 'allow' | 'block' | 'inconclusive'

export interface GuardDiagnostic {
  status: GuardStatus
  regenerated: boolean
  passed?: boolean
  warnings?: string[]
  character_count?: number
  length_limit?: number
  question_count?: number
  list_item_count?: number
}

export interface ChatDebug {
  models?: Record<string, string>
  safety?: { decision?: string, level?: string }
  route?: { capsule_id?: string, capsule_title?: string, confidence?: number, method?: string, fallback_reason?: string }
  ground?: { loaded?: boolean, selected_branch_numbers?: number[], resolved_ground?: string[], warnings?: string[] }
  output_guard?: GuardDiagnostic
  timings?: Record<string, number | null>
}

export interface ConversationSummary {
  id: string
  created_at: string | number
  updated_at?: string | number
  expires_at?: string | null
}

export interface ConversationTurn {
  number?: number
  response_id?: string
  user: string
  assistant: string
  route_id: string
  safety_level: SafetyLevel
  debug?: ChatDebug | null
}

export interface ConversationView {
  conversation_id: string
  turns: ConversationTurn[]
  next_after?: number | null
}

export interface CompletedResponse {
  conversation_id: string
  response_id: string
  safety_level: SafetyLevel
  debug?: ChatDebug
}
