-- APVerse only. Keep PostgreSQL's internal event-trigger invocation intact,
-- while removing unnecessary client-role EXECUTE grants on this event function.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;
