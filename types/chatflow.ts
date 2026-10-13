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
  length_limit_enforced?: boolean
  question_count?: number
  list_item_count?: number
}

export interface ChatDebug {
  [key: string]: unknown
  models?: Record<string, string>
  redaction?: { redacted_text?: string, pii_tags?: { type: string, placeholder: string }[] }
  safety?: {
    decision?: string, level?: string, response_key?: string | null, suspected_crisis_type?: string | null,
    clarification_question?: string | null, bystander?: boolean, evidence?: string, reason?: string,
    fallback_reason?: string, supplied_context_turns?: number,
  }
  route?: {
    capsule_id?: string, capsule_title?: string, confidence?: number, method?: string, fallback_reason?: string,
    reason?: string, should_continue_active_capsule?: boolean, raw_candidate?: { capsule_id: string, confidence: number },
  }
  ground?: {
    loaded?: boolean, selected_branch_numbers?: number[], resolved_ground?: string[], warnings?: string[],
    entry_count?: number, node_count?: number, loading_reason?: string, selection_reason?: string,
  }
  state?: { has_previous_response_id?: boolean, previous_response_model?: string, active_capsule_id?: string, ttl_turns?: number }
  router_context?: { configured_turns?: number, supplied_completed_turns?: number }
  capsule_issues?: unknown[]
  output_guard?: GuardDiagnostic
  timings?: Record<string, number | null>
}

export type DebugChatItem = import('./app').ChatItem & { debug?: ChatDebug | null }

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
