-- Additive migration, run explicitly against CHATFLOW_DATABASE_URL with a DDL role.
-- Double quotes preserve the requested camelCase column name "createdAt".
BEGIN;
CREATE TABLE IF NOT EXISTS xiaoan_contact_feedback (
  "id" varchar(64) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "message" text NOT NULL CHECK (char_length(btrim("message")) BETWEEN 1 AND 2000),
  "name" varchar(50),
  "phone" varchar(20),
  "wechat" varchar(50),
  "email" varchar(100)
);
CREATE INDEX IF NOT EXISTS xiaoan_contact_feedback_created_at
  ON xiaoan_contact_feedback ("createdAt" DESC, "id" DESC);
CREATE TABLE IF NOT EXISTS xiaoan_contact_admin_access (
  id bigserial PRIMARY KEY,
  clerk_user_id varchar(255) NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
