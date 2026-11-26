-- Run explicitly as table owner after 007. Provision a dedicated login and
-- grant it membership in xiaoan_feedback_cleanup outside this script.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'xiaoan_feedback_cleanup') THEN
    CREATE ROLE xiaoan_feedback_cleanup NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO xiaoan_feedback_cleanup;
GRANT DELETE ON public.xiaoan_contact_feedback, public.xiaoan_chat_failures, public.xiaoan_speech_recordings,
  public.xiaoan_admin_access, public.xiaoan_contact_admin_access, public.xiaoan_failure_admin_access,
  public.xiaoan_speech_admin_access TO xiaoan_feedback_cleanup;
GRANT SELECT (id, expires_at) ON public.xiaoan_contact_feedback, public.xiaoan_chat_failures,
  public.xiaoan_speech_recordings TO xiaoan_feedback_cleanup;
GRANT SELECT (id, accessed_at) ON public.xiaoan_admin_access, public.xiaoan_contact_admin_access,
  public.xiaoan_failure_admin_access, public.xiaoan_speech_admin_access TO xiaoan_feedback_cleanup;
-- SELECT FOR UPDATE requires UPDATE on at least one column of each target.
GRANT UPDATE (id) ON public.xiaoan_contact_feedback, public.xiaoan_chat_failures, public.xiaoan_speech_recordings,
  public.xiaoan_admin_access, public.xiaoan_contact_admin_access, public.xiaoan_failure_admin_access,
  public.xiaoan_speech_admin_access TO xiaoan_feedback_cleanup;
COMMIT;
