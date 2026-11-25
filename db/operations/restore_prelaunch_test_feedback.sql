-- Explicitly approved internal test inventory, cutoff 2026-11-25 01:12:36 HKT.
-- No user consent is changed. Existing history only; no deleted data recreated.
BEGIN;
CREATE TABLE IF NOT EXISTS xiaoan_prelaunch_feedback (
  conversation_id varchar(36) PRIMARY KEY REFERENCES account_conversations(id) ON DELETE CASCADE,
  max_turn_number integer NOT NULL,
  previous_guest_expires_at double precision,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS xiaoan_prelaunch_retention (
  response_id varchar(36) PRIMARY KEY REFERENCES account_turns(response_id) ON DELETE CASCADE,
  previous_expires_at double precision NOT NULL
);
CREATE TABLE IF NOT EXISTS xiaoan_prelaunch_failures (
  failure_id varchar(128) PRIMARY KEY REFERENCES xiaoan_chat_failures(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now()
);
-- A one-time marker prevents re-running this file from expanding the inventory.
CREATE TABLE IF NOT EXISTS xiaoan_prelaunch_backfill_run (
  id integer PRIMARY KEY CHECK (id=1), completed_at timestamptz NOT NULL DEFAULT now()
);
LOCK TABLE account_conversations, account_turns, conversation_turn_retention IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO xiaoan_prelaunch_feedback(conversation_id,max_turn_number,previous_guest_expires_at)
SELECT c.id,coalesce(max(t.number) FILTER(WHERE r.completed_at<1795540356),0),c.expires_at
FROM account_conversations c LEFT JOIN account_turns t ON t.conversation_id=c.id
LEFT JOIN conversation_turn_retention r ON r.response_id=t.response_id
WHERE c.created_at<1795540356
  AND NOT EXISTS(SELECT 1 FROM xiaoan_prelaunch_backfill_run WHERE id=1)
GROUP BY c.id,c.expires_at
ON CONFLICT(conversation_id) DO NOTHING;
INSERT INTO xiaoan_prelaunch_retention(response_id,previous_expires_at)
SELECT r.response_id,r.expires_at FROM conversation_turn_retention r
JOIN account_turns t ON t.response_id=r.response_id
JOIN xiaoan_prelaunch_feedback h ON h.conversation_id=t.conversation_id
WHERE r.completed_at<1795540356 AND t.number<=h.max_turn_number
  AND NOT EXISTS(SELECT 1 FROM xiaoan_prelaunch_backfill_run WHERE id=1)
ON CONFLICT(response_id) DO NOTHING;
UPDATE conversation_turn_retention r SET expires_at=253402214400
WHERE EXISTS(SELECT 1 FROM xiaoan_prelaunch_retention h WHERE h.response_id=r.response_id)
  AND NOT EXISTS(SELECT 1 FROM xiaoan_prelaunch_backfill_run WHERE id=1);
INSERT INTO xiaoan_prelaunch_failures(failure_id)
SELECT id FROM xiaoan_chat_failures
WHERE created_at<to_timestamp(1795540356)
  AND NOT EXISTS(SELECT 1 FROM xiaoan_prelaunch_backfill_run WHERE id=1)
ON CONFLICT(failure_id) DO NOTHING;
-- NULL expiry denies old guest credentials and excludes these internal tests
-- from the existing expired-guest purge. Account ownership is never reassigned.
UPDATE account_conversations c SET expires_at=NULL, revision=revision+1
WHERE c.user_id IS NULL AND c.created_at<1795540356
  AND EXISTS(SELECT 1 FROM xiaoan_prelaunch_feedback h WHERE h.conversation_id=c.id)
  AND NOT EXISTS(SELECT 1 FROM xiaoan_prelaunch_backfill_run WHERE id=1);
INSERT INTO xiaoan_prelaunch_backfill_run(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
GRANT SELECT ON xiaoan_prelaunch_feedback,xiaoan_prelaunch_failures TO xiaoan_feedback_web;
COMMIT;
