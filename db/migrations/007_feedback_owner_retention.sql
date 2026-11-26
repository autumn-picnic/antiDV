BEGIN;
ALTER TABLE xiaoan_contact_feedback
  ADD COLUMN IF NOT EXISTS owner_kind varchar(8) CHECK (owner_kind IN ('user','guest')),
  ADD COLUMN IF NOT EXISTS owner_ref varchar(255),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE xiaoan_chat_failures
  ADD COLUMN IF NOT EXISTS guest_hash varchar(64),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS owned_conversation_id varchar(36) REFERENCES account_conversations(id) ON DELETE CASCADE;
ALTER TABLE xiaoan_speech_recordings
  ADD COLUMN IF NOT EXISTS guest_hash varchar(64),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE INDEX IF NOT EXISTS xiaoan_contact_feedback_owner ON xiaoan_contact_feedback(owner_kind, owner_ref);
CREATE INDEX IF NOT EXISTS xiaoan_chat_failures_owned_conversation ON xiaoan_chat_failures(owned_conversation_id);
CREATE INDEX IF NOT EXISTS xiaoan_chat_failures_owner ON xiaoan_chat_failures(clerk_user_id);
CREATE INDEX IF NOT EXISTS xiaoan_chat_failures_guest ON xiaoan_chat_failures(guest_hash);
CREATE INDEX IF NOT EXISTS xiaoan_speech_recordings_owner ON xiaoan_speech_recordings(clerk_user_id);
CREATE INDEX IF NOT EXISTS xiaoan_speech_recordings_guest ON xiaoan_speech_recordings(guest_hash);
CREATE INDEX IF NOT EXISTS xiaoan_contact_feedback_expiry ON xiaoan_contact_feedback(expires_at);
CREATE INDEX IF NOT EXISTS xiaoan_chat_failures_expiry ON xiaoan_chat_failures(expires_at);
CREATE INDEX IF NOT EXISTS xiaoan_speech_recordings_expiry ON xiaoan_speech_recordings(expires_at);
GRANT DELETE ON xiaoan_contact_feedback, xiaoan_chat_failures, xiaoan_speech_recordings TO xiaoan_feedback_web;
COMMIT;
