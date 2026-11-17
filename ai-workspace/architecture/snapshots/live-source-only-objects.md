# Exact source-only application objects

Live read-only comparison on 17 November 2026. “Source-only” means absent by qualified name/signature from destination; it does not establish a missing feature or authorize copying these objects. Equivalent destination implementations must be evaluated by behavior and authority.

## Database functions — 100

- `public.app_acknowledge_class_setup(p_workspace_id uuid, p_intent_id uuid)` → `boolean`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_advance_class_setup(p_workspace_id uuid, p_prior_intent_id uuid, p_request_id uuid, p_course_name text, p_batch_name text)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_current_class_setup(p_workspace_id uuid)` → `TABLE(state text, intent_id uuid, prior_intent_id uuid, request_id uuid, course_name text, batch_name text, course_id uuid, batch_id uuid, acknowledged boolean)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_archived_class_setup(p_workspace_id uuid, p_intent_id uuid)` → `TABLE(state text, intent_id uuid, course_name text, batch_name text, course_id uuid, batch_id uuid)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_complete_class_setup(p_workspace_id uuid, p_intent_id uuid)` → `TABLE(course_id uuid, batch_id uuid)`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.handle_new_auth_user()` → `trigger`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.assert_schedule_write_access(p_workspace_id uuid, p_batch_id uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.create_private_session(p_workspace_id uuid, p_batch_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_request_id uuid)` → `uuid`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_list_archived_class_setups(p_workspace_id uuid, p_after_id uuid, p_limit integer)` → `TABLE(intent_id uuid, course_name text, batch_name text, course_id uuid, batch_id uuid)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.create_private_local_session(p_workspace_id uuid, p_batch_id uuid, p_local_start timestamp without time zone, p_duration_minutes integer, p_request_id uuid)` → `uuid`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.configure_private_workspace_zone(p_workspace_id uuid, p_zone text)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.assert_private_workspace_manager(p_workspace_id uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.create_private_course(p_workspace_id uuid, p_name text, p_request_id uuid)` → `uuid`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.create_private_batch(p_workspace_id uuid, p_course_id uuid, p_name text, p_request_id uuid)` → `uuid`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.create_course(p_workspace_id uuid, p_name text, p_request_id uuid)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.mutate_private_batch_coach(p_workspace_id uuid, p_batch_id uuid, p_membership_id uuid, p_request_id uuid, p_operation text)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.assign_private_batch_coach(p_workspace_id uuid, p_batch_id uuid, p_membership_id uuid, p_request_id uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.remove_private_batch_coach(p_workspace_id uuid, p_batch_id uuid, p_membership_id uuid, p_request_id uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.create_batch(p_workspace_id uuid, p_course_id uuid, p_name text, p_request_id uuid)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.assert_private_class_setup_enabled()` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.reserve_private_class_setup(p_workspace_id uuid, p_course_name text, p_batch_name text)` → `uuid`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.complete_private_class_setup(p_workspace_id uuid, p_intent_id uuid)` → `TABLE(course_id uuid, batch_id uuid)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.private_class_setup_status(p_workspace_id uuid)` → `TABLE(state text, intent_id uuid, course_id uuid, batch_id uuid)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.assert_private_family_invite_access(p_workspace_id uuid, p_issuer uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.create_course_and_batch(p_workspace_id uuid, p_course_name text, p_batch_name text, p_request_id uuid)` → `TABLE(course_id uuid, batch_id uuid)`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.recover_private_current_class_setup_v2(p_workspace_id uuid)` → `TABLE(state text, intent_id uuid, prior_intent_id uuid, request_id uuid, course_name text, batch_name text, course_id uuid, batch_id uuid, acknowledged boolean, time_zone text, start_date date, start_time time without time zone, end_date date, duration_minutes integer, occurrence_count integer)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.create_child(p_display_name text, p_request_id uuid)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.app_current_class_setup_v2(p_workspace_id uuid)` → `TABLE(state text, intent_id uuid, prior_intent_id uuid, request_id uuid, course_name text, batch_name text, course_id uuid, batch_id uuid, acknowledged boolean, time_zone text, start_date date, start_time time without time zone, end_date date, duration_minutes integer, occurrence_count integer)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.recover_private_archived_class_setup(p_workspace_id uuid, p_intent_id uuid)` → `TABLE(state text, intent_id uuid, course_name text, batch_name text, course_id uuid, batch_id uuid)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.list_private_archived_class_setups(p_workspace_id uuid, p_after_id uuid, p_limit integer)` → `TABLE(intent_id uuid, course_name text, batch_name text, course_id uuid, batch_id uuid)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.recover_private_current_class_setup(p_workspace_id uuid)` → `TABLE(state text, intent_id uuid, prior_intent_id uuid, request_id uuid, course_name text, batch_name text, course_id uuid, batch_id uuid, acknowledged boolean)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_reserve_class_setup(p_workspace_id uuid, p_course_name text, p_batch_name text)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.app_list_created_children()` → `TABLE(child_id uuid, display_name text)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.lock_private_child_creation_actor()` → `uuid`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.assert_private_child_creation_access(p_actor uuid, p_child uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_begin_class_setup(p_workspace_id uuid, p_course_name text, p_batch_name text)` → `TABLE(disposition text, state text, intent_id uuid)`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.app_begin_class_setup_v2(p_workspace_id uuid, p_expected_generation bigint, p_request_id uuid, p_course_name text, p_batch_name text)` → `TABLE(disposition text, state text, intent_id uuid, generation bigint)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_current_child_creation()` → `TABLE(intent_id uuid, child_id uuid, display_name text, acknowledged boolean, prior_intent_id uuid, request_id uuid)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_ack_child_creation(p_intent_id uuid)` → `boolean`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_begin_child_creation(p_display_name text, p_prior_intent_id uuid, p_request_id uuid)` → `TABLE(intent_id uuid, child_id uuid, display_name text, acknowledged boolean, prior_intent_id uuid, request_id uuid, disposition text)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_fence_child_creation(p_prior_intent_id uuid, p_request_id uuid)` → `text`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.archive_private_child_creation_intent()` → `trigger`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.app_family_roster(p_workspace_id uuid, p_after uuid)` → `TABLE(relationship_id uuid, child_name text, relationship_status text)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_historical_child_creation(p_prior_intent_id uuid, p_request_id uuid)` → `text`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.assert_private_enrollment_target(p_workspace_id uuid, p_batch_id uuid, p_child_id uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_child_academies(p_child_id uuid)` → `TABLE(relationship_id uuid, academy_name text, relationship_status text)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.approve_guardian_connection(p_connection_request_id uuid)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.request_workspace_connection(p_workspace_id uuid, p_child_id uuid, p_request_id uuid)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.record_workspace_creation_tombstone()` → `trigger`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.guard_fenced_workspace_creation()` → `trigger`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.create_workspace(p_name text, p_type text, p_request_id uuid)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.workspace_creation_recovery_status(p_request_id uuid)` → `TABLE(status text, workspace_id uuid)`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.fence_workspace_creation(p_request_id uuid)` → `text`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.create_workspace_unguarded_private(p_name text, p_type text, p_request_id uuid)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.acknowledge_private_class_setup(p_workspace_id uuid, p_intent_id uuid)` → `boolean`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.advance_private_class_setup(p_workspace_id uuid, p_prior_intent_id uuid, p_request_id uuid, p_course_name text, p_batch_name text)` → `uuid`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_issue_family_invite(p_workspace_id uuid, p_request_id uuid, p_token text)` → `TABLE(invite_id uuid, expires_at timestamp with time zone)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.workspace_creation_key_for_workspace(p_workspace_id uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=false.
- `public.get_private_class_setup_generation(p_workspace_id uuid)` → `TABLE(generation bigint, available boolean)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_class_setup_generation(p_workspace_id uuid)` → `TABLE(generation bigint, available boolean)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.begin_private_class_setup(p_workspace_id uuid, p_expected_generation bigint, p_request_id uuid, p_course_name text, p_batch_name text)` → `TABLE(disposition text, state text, intent_id uuid, generation bigint)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.complete_private_class_setup_weekly(p_workspace_id uuid, p_intent_id uuid, p_time_zone text, p_start_date date, p_start_time time without time zone, p_end_date date, p_duration_minutes integer)` → `TABLE(course_id uuid, batch_id uuid, time_zone text, start_date date, start_time time without time zone, end_date date, duration_minutes integer, occurrence_count integer)`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_complete_class_setup_weekly(p_workspace_id uuid, p_intent_id uuid, p_time_zone text, p_start_date date, p_start_time time without time zone, p_end_date date, p_duration_minutes integer)` → `TABLE(course_id uuid, batch_id uuid, time_zone text, start_date date, start_time time without time zone, end_date date, duration_minutes integer, occurrence_count integer)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_preview_family_invite(p_token text)` → `TABLE(academy_name text, expires_at timestamp with time zone, state text)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_accept_family_invite(p_token text, p_child_id uuid)` → `uuid`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_enrollment_candidates(p_workspace_id uuid, p_after uuid)` → `TABLE(child_id uuid, child_name text)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_enrollment_batches(p_workspace_id uuid)` → `TABLE(batch_id uuid, batch_name text, course_name text)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_batch_enrollments(p_workspace_id uuid, p_batch_id uuid, p_after uuid)` → `TABLE(enrollment_id uuid, child_id uuid, child_name text, status text, version integer)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_save_enrollment(p_workspace_id uuid, p_batch_id uuid, p_child_id uuid, p_request_id uuid)` → `TABLE(enrollment_id uuid, status text, version integer)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_change_enrollment(p_enrollment_id uuid, p_status text, p_expected_version integer, p_reason text, p_request_id uuid)` → `TABLE(enrollment_id uuid, status text, version integer)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_parent_enrollments(p_child_id uuid)` → `TABLE(enrollment_id uuid, academy_name text, batch_name text, course_name text, status text, version integer)`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.attendance_clock()` → `timestamp with time zone`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_attendance_request_status(p_workspace_id uuid, p_session_id uuid, p_request_id uuid, p_payload jsonb)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_attendance_sheet(p_workspace_id uuid, p_session_id uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.attendance_zone(p_workspace uuid, p_date date)` → `text`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_parent_academies(p_child_id uuid, p_after uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_parent_attendance_week(p_child_id uuid, p_workspace_id uuid, p_week_start date, p_batch_id uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_parent_batches(p_child_id uuid, p_workspace_id uuid, p_after uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.parent_signal_json(s parent_signals)` → `jsonb`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.app_parent_items(p_child_id uuid, p_workspace_id uuid, p_batch_id uuid, p_before_created timestamp with time zone, p_before_id uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_parent_sessions(p_child_id uuid, p_workspace_id uuid, p_date date, p_batch_id uuid, p_after_start timestamp with time zone, p_after_id uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_parent_signal_request_status(p_child_id uuid, p_workspace_id uuid, p_session_id uuid, p_request_id uuid, p_payload jsonb)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_save_attendance(p_workspace_id uuid, p_session_id uuid, p_expected_session_version integer, p_expected_sheet_version integer, p_roster_token text, p_records jsonb, p_request_id uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_send_parent_signal(p_child_id uuid, p_workspace_id uuid, p_session_id uuid, p_expected_session_version integer, p_type text, p_reason text, p_request_id uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_session_parent_signals(p_workspace_id uuid, p_session_id uuid, p_after_child uuid, p_after_actor uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_today_academies(p_after uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.app_today_sessions(p_workspace_id uuid, p_date date, p_after_start timestamp with time zone, p_after_id uuid)` → `jsonb`; SECURITY DEFINER; client execute: anon=false, authenticated=true.
- `public.attendance_parent(p_child uuid, p_workspace uuid, p_batch uuid, p_session uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_payload(p jsonb)` → `jsonb`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_payload_access(p jsonb, p_batch uuid)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_read_committed()` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_receipt(r attendance_request_receipts)` → `jsonb`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_roster(p_workspace uuid, p_batch uuid, p_lock boolean)` → `jsonb`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_save_roster_locks(p_workspace uuid, p_batch uuid, p_records jsonb)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_session_json(p_session uuid, p_roster jsonb)` → `jsonb`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_session_lifecycle()` → `trigger`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_staff(p_workspace uuid, p_batch uuid, p_update boolean)` → `void`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.attendance_zone(p_workspace uuid)` → `text`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.parent_signal_payload(p jsonb)` → `jsonb`; SECURITY INVOKER; client execute: anon=false, authenticated=false.
- `public.parent_signal_receipt(q parent_signal_request_receipts)` → `jsonb`; SECURITY INVOKER; client execute: anon=false, authenticated=false.

## Index definitions — 93

These include primary-key/unique indexes. They reference the source model and are not an installation checklist.

```sql
CREATE UNIQUE INDEX workspace_memberships_pkey ON public.workspace_memberships USING btree (id);
CREATE UNIQUE INDEX workspace_memberships_workspace_id_user_id_key ON public.workspace_memberships USING btree (workspace_id, user_id);
CREATE INDEX workspace_memberships_user_idx ON public.workspace_memberships USING btree (user_id);
CREATE INDEX workspace_memberships_workspace_idx ON public.workspace_memberships USING btree (workspace_id);
CREATE UNIQUE INDEX workspace_memberships_workspace_id_id_key ON public.workspace_memberships USING btree (workspace_id, id);
CREATE UNIQUE INDEX children_pkey ON public.children USING btree (id);
CREATE INDEX children_created_by_idx ON public.children USING btree (created_by);
CREATE UNIQUE INDEX children_creation_request_idx ON public.children USING btree (created_by, creation_request_id) WHERE (creation_request_id IS NOT NULL);
CREATE UNIQUE INDEX guardianships_pkey ON public.guardianships USING btree (id);
CREATE UNIQUE INDEX guardianships_child_id_guardian_user_id_key ON public.guardianships USING btree (child_id, guardian_user_id);
CREATE INDEX guardianships_guardian_idx ON public.guardianships USING btree (guardian_user_id);
CREATE INDEX guardianships_child_idx ON public.guardianships USING btree (child_id);
CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);
CREATE UNIQUE INDEX workspaces_created_by_creation_request_id_key ON public.workspaces USING btree (created_by, creation_request_id);
CREATE UNIQUE INDEX connection_requests_pkey ON public.connection_requests USING btree (id);
CREATE INDEX connection_requests_workspace_idx ON public.connection_requests USING btree (workspace_id);
CREATE INDEX connection_requests_guardian_idx ON public.connection_requests USING btree (guardian_user_id);
CREATE INDEX connection_requests_child_idx ON public.connection_requests USING btree (child_id);
CREATE UNIQUE INDEX connection_request_idempotency_idx ON public.connection_requests USING btree (initiated_by, creation_request_id) WHERE (creation_request_id IS NOT NULL);
CREATE UNIQUE INDEX guardian_pending_connection_idx ON public.connection_requests USING btree (workspace_id, child_id, guardian_user_id) WHERE ((initiation_type = 'guardian'::text) AND (status = 'pending'::text));
CREATE UNIQUE INDEX connection_events_pkey ON public.connection_events USING btree (id);
CREATE INDEX connection_events_request_idx ON public.connection_events USING btree (connection_request_id);
CREATE INDEX connection_events_relationship_idx ON public.connection_events USING btree (workspace_child_id);
CREATE UNIQUE INDEX workspace_children_pkey ON public.workspace_children USING btree (id);
CREATE UNIQUE INDEX workspace_children_workspace_id_child_id_key ON public.workspace_children USING btree (workspace_id, child_id);
CREATE INDEX workspace_children_child_idx ON public.workspace_children USING btree (child_id);
CREATE UNIQUE INDEX batch_coach_assignments_pkey ON public.batch_coach_assignments USING btree (workspace_id, batch_id, membership_id);
CREATE UNIQUE INDEX class_setup_requests_pkey ON public.class_setup_requests USING btree (actor_id, request_id);
CREATE UNIQUE INDEX batch_coach_mutation_requests_pkey ON public.batch_coach_mutation_requests USING btree (actor_id, request_id);
CREATE UNIQUE INDEX courses_pkey ON public.courses USING btree (id);
CREATE UNIQUE INDEX courses_workspace_id_id_key ON public.courses USING btree (workspace_id, id);
CREATE UNIQUE INDEX course_request_unique ON public.courses USING btree (created_by, creation_request_id);
CREATE UNIQUE INDEX class_setup_controls_pkey ON public.class_setup_controls USING btree (id);
CREATE UNIQUE INDEX batches_workspace_id_id_key ON public.batches USING btree (workspace_id, id);
CREATE UNIQUE INDEX batch_request_unique ON public.batches USING btree (created_by, creation_request_id);
CREATE UNIQUE INDEX class_setup_intents_pkey ON public.class_setup_intents USING btree (id);
CREATE UNIQUE INDEX class_setup_intents_actor_id_workspace_id_key ON public.class_setup_intents USING btree (actor_id, workspace_id);
CREATE UNIQUE INDEX class_setup_one_unresolved_per_workspace ON public.class_setup_intents USING btree (workspace_id) WHERE (NOT acknowledged);
CREATE UNIQUE INDEX schedule_sessions_pkey ON public.schedule_sessions USING btree (id);
CREATE UNIQUE INDEX schedule_sessions_created_by_creation_request_id_key ON public.schedule_sessions USING btree (created_by, creation_request_id);
CREATE UNIQUE INDEX schedule_sessions_series_date_unique ON public.schedule_sessions USING btree (class_setup_intent_id, local_date);
CREATE UNIQUE INDEX schedule_sessions_workspace_id_batch_id_id_key ON public.schedule_sessions USING btree (workspace_id, batch_id, id);
CREATE INDEX attendance_sessions_workspace_page ON public.schedule_sessions USING btree (workspace_id, starts_at, id);
CREATE INDEX attendance_sessions_batch_page ON public.schedule_sessions USING btree (workspace_id, batch_id, starts_at, id);
CREATE UNIQUE INDEX child_creation_intents_pkey ON public.child_creation_intents USING btree (actor_id);
CREATE UNIQUE INDEX child_creation_intents_id_key ON public.child_creation_intents USING btree (id);
CREATE UNIQUE INDEX class_setup_next_requests_pkey ON public.class_setup_next_requests USING btree (actor_id, request_id);
CREATE UNIQUE INDEX class_setup_next_intent_unique ON public.class_setup_next_requests USING btree (next_intent_id);
CREATE UNIQUE INDEX child_creation_history_pkey ON public.child_creation_history USING btree (intent_id);
CREATE UNIQUE INDEX child_creation_history_actor_id_prior_intent_id_request_id_key ON public.child_creation_history USING btree (actor_id, prior_intent_id, request_id) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX parent_child_read_controls_pkey ON public.parent_child_read_controls USING btree (id);
CREATE UNIQUE INDEX child_creation_fences_pkey ON public.child_creation_fences USING btree (actor_id, request_id);
CREATE UNIQUE INDEX child_creation_controls_pkey ON public.child_creation_controls USING btree (id);
CREATE UNIQUE INDEX connection_request_receipts_pkey ON public.connection_request_receipts USING btree (actor_id, request_key);
CREATE UNIQUE INDEX workspace_creation_controls_pkey ON public.workspace_creation_controls USING btree (id);
CREATE UNIQUE INDEX workspace_creation_receipts_pkey ON public.workspace_creation_receipts USING btree (actor_id, request_key);
CREATE UNIQUE INDEX workspace_creation_fences_pkey ON public.workspace_creation_fences USING btree (actor_id, request_key);
CREATE UNIQUE INDEX class_setup_intent_history_pkey ON public.class_setup_intent_history USING btree (id);
CREATE INDEX class_setup_intent_history_actor_workspace_id_idx ON public.class_setup_intent_history USING btree (actor_id, workspace_id, id);
CREATE UNIQUE INDEX family_invites_pkey ON public.family_invites USING btree (id);
CREATE UNIQUE INDEX family_invites_token_hash_key ON public.family_invites USING btree (token_hash);
CREATE UNIQUE INDEX class_setup_workspace_versions_pkey ON public.class_setup_workspace_versions USING btree (workspace_id);
CREATE UNIQUE INDEX class_setup_begin_requests_pkey ON public.class_setup_begin_requests USING btree (actor_id, request_id);
CREATE INDEX class_setup_begin_requests_workspace_generation_idx ON public.class_setup_begin_requests USING btree (workspace_id, expected_generation);
CREATE UNIQUE INDEX class_setup_session_series_pkey ON public.class_setup_session_series USING btree (class_setup_intent_id);
CREATE UNIQUE INDEX enrollments_pkey ON public.enrollments USING btree (id);
CREATE UNIQUE INDEX enrollments_child_id_batch_id_key ON public.enrollments USING btree (child_id, batch_id);
CREATE INDEX enrollments_workspace_batch_page_idx ON public.enrollments USING btree (workspace_id, batch_id, id);
CREATE INDEX enrollments_child_page_idx ON public.enrollments USING btree (child_id, id);
CREATE UNIQUE INDEX enrollments_workspace_id_batch_id_child_id_id_key ON public.enrollments USING btree (workspace_id, batch_id, child_id, id);
CREATE INDEX attendance_active_enrollments ON public.enrollments USING btree (workspace_id, batch_id, id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX enrollment_request_receipts_pkey ON public.enrollment_request_receipts USING btree (request_id);
CREATE INDEX enrollment_receipts_workspace_idx ON public.enrollment_request_receipts USING btree (workspace_id);
CREATE UNIQUE INDEX enrollment_events_pkey ON public.enrollment_events USING btree (id);
CREATE UNIQUE INDEX enrollment_events_enrollment_id_version_key ON public.enrollment_events USING btree (enrollment_id, version);
CREATE UNIQUE INDEX attendance_sheets_pkey ON public.attendance_sheets USING btree (session_id);
CREATE UNIQUE INDEX attendance_sheets_workspace_id_batch_id_session_id_key ON public.attendance_sheets USING btree (workspace_id, batch_id, session_id);
CREATE UNIQUE INDEX attendance_records_pkey ON public.attendance_records USING btree (session_id, enrollment_id);
CREATE UNIQUE INDEX attendance_records_session_id_child_id_key ON public.attendance_records USING btree (session_id, child_id);
CREATE UNIQUE INDEX attendance_records_workspace_id_batch_id_session_id_enrollm_key ON public.attendance_records USING btree (workspace_id, batch_id, session_id, enrollment_id, child_id);
CREATE INDEX attendance_records_child_time ON public.attendance_records USING btree (child_id, confirmed_at DESC, session_id);
CREATE UNIQUE INDEX attendance_record_events_pkey ON public.attendance_record_events USING btree (id);
CREATE UNIQUE INDEX attendance_record_events_session_id_enrollment_id_sheet_ver_key ON public.attendance_record_events USING btree (session_id, enrollment_id, sheet_version);
CREATE INDEX attendance_events_sheet ON public.attendance_record_events USING btree (session_id, sheet_version, enrollment_id);
CREATE UNIQUE INDEX attendance_request_receipts_pkey ON public.attendance_request_receipts USING btree (request_id);
CREATE UNIQUE INDEX parent_signals_pkey ON public.parent_signals USING btree (id);
CREATE UNIQUE INDEX parent_signals_workspace_id_batch_id_session_id_child_id_id_key ON public.parent_signals USING btree (workspace_id, batch_id, session_id, child_id, id);
CREATE INDEX parent_signals_latest ON public.parent_signals USING btree (session_id, child_id, actor_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX parent_signal_request_receipts_pkey ON public.parent_signal_request_receipts USING btree (request_id);
CREATE UNIQUE INDEX parent_signal_request_receipts_signal_id_key ON public.parent_signal_request_receipts USING btree (signal_id);
CREATE UNIQUE INDEX parent_items_pkey ON public.parent_items USING btree (id);
CREATE UNIQUE INDEX parent_items_workspace_id_child_id_type_source_session_id_key ON public.parent_items USING btree (workspace_id, child_id, type, source_session_id);
CREATE INDEX parent_items_page ON public.parent_items USING btree (child_id, created_at DESC, id DESC);
```

Exact tables, columns, constraints, triggers, policies and grants in the inspected schemas are preserved in [the snapshots](live-source-database-audit.json) and [object differences](live-object-differences.json). Managed Auth/Storage objects are included in snapshots; source-only counts above refer to application schemas.

