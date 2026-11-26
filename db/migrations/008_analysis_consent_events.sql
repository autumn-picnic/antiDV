BEGIN;
CREATE TABLE IF NOT EXISTS xiaoan_analysis_consent_events (
  id bigserial PRIMARY KEY,
  clerk_user_id varchar(255) NOT NULL,
  action varchar(16) NOT NULL CHECK (action IN ('grant', 'withdraw')),
  version varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xiaoan_analysis_consent_events_user
  ON xiaoan_analysis_consent_events(clerk_user_id);
GRANT SELECT, INSERT ON xiaoan_analysis_consent_events TO xiaoan_feedback_web;
GRANT USAGE ON SEQUENCE xiaoan_analysis_consent_events_id_seq TO xiaoan_feedback_web;
COMMIT;
