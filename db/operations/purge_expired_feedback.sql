-- Run after migration 007 in a database job with feedback-table delete privileges.
-- Each invocation limits the transaction to 200 rows per table.
BEGIN;
WITH expired AS (
  SELECT id FROM xiaoan_contact_feedback WHERE expires_at <= now()
  ORDER BY expires_at, id LIMIT 200 FOR UPDATE SKIP LOCKED
), removed AS (
  DELETE FROM xiaoan_contact_feedback WHERE id IN (SELECT id FROM expired) RETURNING 1
)
SELECT count(*) AS deleted_contact FROM removed;
WITH expired AS (
  SELECT id FROM xiaoan_chat_failures WHERE expires_at <= now()
  ORDER BY expires_at, id LIMIT 200 FOR UPDATE SKIP LOCKED
), removed AS (
  DELETE FROM xiaoan_chat_failures WHERE id IN (SELECT id FROM expired) RETURNING 1
)
SELECT count(*) AS deleted_failures FROM removed;
WITH expired AS (
  SELECT id FROM xiaoan_speech_recordings WHERE expires_at <= now()
  ORDER BY expires_at, id LIMIT 200 FOR UPDATE SKIP LOCKED
), removed AS (
  DELETE FROM xiaoan_speech_recordings WHERE id IN (SELECT id FROM expired) RETURNING 1
)
SELECT count(*) AS deleted_recordings FROM removed;
COMMIT;
