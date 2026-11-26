-- Execute only after all writers use the new columns and the retention policy is approved.
-- Re-running leaves previously assigned deadlines intact. No historical owner is inferred.
BEGIN;
UPDATE public.xiaoan_contact_feedback SET expires_at = now() + interval '180 days' WHERE expires_at IS NULL;
UPDATE public.xiaoan_chat_failures SET expires_at = now() + interval '30 days' WHERE expires_at IS NULL;
UPDATE public.xiaoan_speech_recordings SET expires_at = now() + interval '30 days' WHERE expires_at IS NULL;
COMMIT;
