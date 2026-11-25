-- Apply explicitly to the same account PostgreSQL database. No historical generation.
BEGIN;
CREATE TABLE IF NOT EXISTS xiaoan_conversation_titles (
  conversation_id varchar(36) PRIMARY KEY REFERENCES account_conversations(id) ON DELETE CASCADE,
  response_id varchar(36) NOT NULL UNIQUE REFERENCES account_turns(response_id) ON DELETE CASCADE,
  title varchar(96),
  status varchar(16) NOT NULL CHECK (status IN ('pending', 'complete', 'fallback')),
  lease_id varchar(36) NOT NULL,
  lease_until timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 2),
  model varchar(128) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'complete' AND char_length(title) BETWEEN 2 AND 24)
    OR (status <> 'complete' AND title IS NULL))
);
COMMIT;
-- Application role needs SELECT on account_turns, account_conversations,
-- conversation_privacy_policies, conversation_turn_retention; and
-- SELECT, INSERT, UPDATE on xiaoan_conversation_titles. Use the existing scoped role.
