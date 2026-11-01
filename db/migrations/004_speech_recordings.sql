BEGIN;
CREATE TABLE IF NOT EXISTS xiaoan_speech_recordings (
  id uuid PRIMARY KEY,
  clerk_user_id varchar(255),
  audio bytea NOT NULL CHECK (octet_length(audio) BETWEEN 3244 AND 1760044),
  sha256 char(64) NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 100 AND 55000),
  status varchar(16) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','success','failed','cancelled')),
  transcript text CHECK (char_length(transcript) <= 4000),
  detected_locales text[] NOT NULL DEFAULT '{}',
  error_message varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS xiaoan_speech_recordings_created_at ON xiaoan_speech_recordings(created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS xiaoan_speech_admin_access (
  id bigserial PRIMARY KEY,
  clerk_user_id varchar(255) NOT NULL,
  recording_id uuid,
  action varchar(8) NOT NULL CHECK (action IN ('list','play')),
  accessed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON xiaoan_speech_recordings TO xiaoan_feedback_web;
GRANT INSERT ON xiaoan_speech_admin_access TO xiaoan_feedback_web;
GRANT USAGE ON SEQUENCE xiaoan_speech_admin_access_id_seq TO xiaoan_feedback_web;
COMMIT;
