-- Apply explicitly to CHATFLOW_DATABASE_URL before deploying the consent feature.
-- Existing users/conversations remain opted out; do not backfill grants.
BEGIN;
CREATE TABLE IF NOT EXISTS xiaoan_analysis_consent (
  clerk_user_id varchar(255) PRIMARY KEY,
  granted boolean NOT NULL,
  version varchar(32) NOT NULL,
  decided_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS xiaoan_analysis_intents (
  token_hash varchar(64) PRIMARY KEY,
  granted boolean NOT NULL,
  version varchar(32) NOT NULL,
  guest_conversation_id varchar(36) REFERENCES account_conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  consumed_by varchar(255),
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS xiaoan_analysis_intents_expiry ON xiaoan_analysis_intents(expires_at);
CREATE TABLE IF NOT EXISTS xiaoan_conversation_analysis_consent (
  conversation_id varchar(36) PRIMARY KEY REFERENCES account_conversations(id) ON DELETE CASCADE,
  clerk_user_id varchar(255) NOT NULL REFERENCES xiaoan_analysis_consent(clerk_user_id) ON DELETE CASCADE,
  granted boolean NOT NULL,
  version varchar(32) NOT NULL,
  decided_at timestamptz NOT NULL
);
GRANT SELECT, INSERT, UPDATE ON xiaoan_analysis_consent, xiaoan_analysis_intents,
  xiaoan_conversation_analysis_consent TO xiaoan_feedback_web;
COMMIT;
