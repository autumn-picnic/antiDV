BEGIN;
CREATE TABLE IF NOT EXISTS xiaoan_chat_failures (
  id varchar(128) PRIMARY KEY,
  clerk_user_id varchar(255),
  conversation_id varchar(128),
  response_id varchar(128),
  question text NOT NULL CHECK (char_length(btrim(question)) BETWEEN 1 AND 4000),
  stage varchar(32) NOT NULL CHECK (stage IN ('create_conversation', 'generate_response')),
  status integer NOT NULL CHECK (status = 0 OR status BETWEEN 400 AND 599),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  code varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xiaoan_chat_failures_created_at ON xiaoan_chat_failures(created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS xiaoan_failure_admin_access (
  id bigserial PRIMARY KEY,
  clerk_user_id varchar(255) NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
