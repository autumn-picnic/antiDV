-- Apply after migrations 001–008, with the same database owner as app_users.
BEGIN;
CREATE OR REPLACE FUNCTION public.xiaoan_guard_account_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  owner_id text;
BEGIN
  IF TG_TABLE_NAME = 'xiaoan_contact_feedback' THEN
    IF NEW.owner_kind IS DISTINCT FROM 'user' THEN
      RETURN NEW;
    END IF;
    owner_id := NEW.owner_ref;
  ELSIF TG_TABLE_NAME = 'xiaoan_analysis_intents' THEN
    IF TG_OP = 'UPDATE' AND pg_trigger_depth() > 1 AND NEW.guest_conversation_id IS NULL THEN
      RETURN NEW; -- ON DELETE SET NULL when a conversation is removed.
    END IF;
    owner_id := NEW.consumed_by;
  ELSE
    owner_id := NEW.clerk_user_id;
  END IF;
  IF owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Try-lock lets an UPDATE that already holds a tuple lock abort instead of
  -- deadlocking with the cleanup transaction waiting to delete that tuple.
  IF NOT pg_try_advisory_xact_lock_shared(hashtextextended('xiaoan-account-cleanup:' || owner_id, 0)) THEN
    RAISE EXCEPTION 'account cleanup in progress' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id = owner_id AND status <> 'active') THEN
    RAISE EXCEPTION 'account disabled' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('xiaoan_contact_feedback'), ('xiaoan_analysis_intents'), ('xiaoan_chat_failures'),
    ('xiaoan_speech_recordings'), ('xiaoan_answer_feedback'), ('xiaoan_analysis_consent'),
    ('xiaoan_conversation_analysis_consent'), ('xiaoan_analysis_consent_events')
  ) AS tables(table_name) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS xiaoan_guard_account_write ON public.%I', target.table_name);
    EXECUTE format('CREATE TRIGGER xiaoan_guard_account_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.xiaoan_guard_account_write()', target.table_name);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.xiaoan_guard_account_write() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.xiaoan_cleanup_account(owner_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('xiaoan-account-cleanup:' || owner_id, 0));
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id = owner_id AND status IN ('deleting', 'deleted')) THEN
    RAISE EXCEPTION 'account must be disabled' USING ERRCODE = '55000';
  END IF;
  DELETE FROM public.xiaoan_contact_feedback WHERE owner_kind = 'user' AND owner_ref = owner_id;
  DELETE FROM public.xiaoan_chat_failures WHERE clerk_user_id = owner_id;
  DELETE FROM public.xiaoan_speech_recordings WHERE clerk_user_id = owner_id;
  DELETE FROM public.xiaoan_answer_feedback WHERE clerk_user_id = owner_id;
  DELETE FROM public.xiaoan_analysis_intents WHERE consumed_by = owner_id;
  DELETE FROM public.xiaoan_analysis_consent_events WHERE clerk_user_id = owner_id;
  DELETE FROM public.xiaoan_analysis_consent WHERE clerk_user_id = owner_id;
END;
$$;
REVOKE ALL ON FUNCTION public.xiaoan_cleanup_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.xiaoan_cleanup_account(text) TO xiaoan_feedback_web;
CREATE INDEX IF NOT EXISTS xiaoan_analysis_intents_consumed_by ON public.xiaoan_analysis_intents(consumed_by);
COMMIT;
