-- psql variables: :kind = contact | failure | recording and :id = verified record ID.
-- Execute as an authorized operator after verifying the request. Only output row counts.
\set ON_ERROR_STOP on
BEGIN;
WITH removed AS (
  DELETE FROM public.xiaoan_contact_feedback WHERE :'kind' = 'contact' AND id::text = :'id'
    AND owner_kind IS NULL AND owner_ref IS NULL RETURNING 1
) SELECT count(*) AS deleted_contacts FROM removed;
WITH removed AS (
  DELETE FROM public.xiaoan_chat_failures WHERE :'kind' = 'failure' AND id = :'id'
    AND clerk_user_id IS NULL AND guest_hash IS NULL RETURNING 1
) SELECT count(*) AS deleted_failures FROM removed;
WITH removed AS (
  DELETE FROM public.xiaoan_speech_recordings WHERE :'kind' = 'recording' AND id::text = :'id'
    AND clerk_user_id IS NULL AND guest_hash IS NULL RETURNING 1
) SELECT count(*) AS deleted_recordings FROM removed;
COMMIT;
