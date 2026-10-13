export type RetentionMode = 'history' | 'rolling' | 'ephemeral'
export type PrivacyField = 'region' | 'nickname' | 'preferences'
export interface ConversationPolicy {
  mode: RetentionMode
  retention_days: number | null
  expiry_basis: 'per_completed_turn' | 'last_completed_turn' | 'idle_since_completed_turn'
  expires_at: number | null
  policy_version: number
  idle_timeout_seconds: number | null
}
export interface PrivacyOptions {
  fields: PrivacyField[]
  default_allowed: boolean
  default_retention_days: number
  max_retention_days: number
  provinces: Record<string, string>
  city_codes: string[]
}
export interface ConsentStatus { allowed: boolean, version: number, expires_at: number | null }
export interface PrivacyStatus { available: boolean, fields: Record<PrivacyField, ConsentStatus> }
export interface RetentionChange {
  policy_version: number
  mode: RetentionMode
  retention_days: number
  save_existing: boolean
  delete_existing: boolean
  extend_existing: boolean
}
export interface ConsentChange {
  version: number
  allowed: boolean
  value?: string | { province_code: string, city_code?: string, purpose: 'event' | 'help' } | { detail: string, presentation: string }
  retention_days: number
  extend: boolean
}
