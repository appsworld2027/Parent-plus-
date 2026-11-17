-- Apply after private F1/F2 candidates, never to a real project.
insert into coach_private.teaching_workspaces(id,kind,name) values('00000000-0000-0000-0000-000000000013','independent','Private practice');
insert into coach_private.personal_workspace_accounts(user_id,workspace_id) values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000013');
insert into coach_private.workspace_memberships(id,workspace_id,user_id,status,source,accepted_at,effective_from)
select ('00000000-0000-0000-0000-'||lpad((70+n)::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000011',('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  'active','accepted_invitation',now()-interval '1 day',now()-interval '1 day' from generate_series(3,8) n;
insert into coach_private.workspace_memberships(id,workspace_id,user_id,status,source,accepted_at,effective_from) values
('00000000-0000-0000-0000-000000000083','00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000003','active','independent_creation',now()-interval '1 day',now()-interval '1 day');
insert into coach_private.coach_identities(user_id,display_name) values
('00000000-0000-0000-0000-000000000003','Teacher'),('00000000-0000-0000-0000-000000000004','Substitute');
insert into coach_private.workspace_branches(id,workspace_id,name) values
('00000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000011','Branch 1'),
('00000000-0000-0000-0000-000000000062','00000000-0000-0000-0000-000000000011','Branch 2'),
('00000000-0000-0000-0000-000000000063','00000000-0000-0000-0000-000000000012','Branch B');
insert into coach_private.workspace_batch_branches(batch_id,workspace_id,branch_id) values
('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000061'),
('00000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000062');
insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source)
select workspace_id,id,case when user_id='00000000-0000-0000-0000-000000000005' then 'finance' when user_id='00000000-0000-0000-0000-000000000008' then 'owner' else 'instructor' end,'workspace','explicit_grant'
from coach_private.workspace_memberships where source<>'legacy_ownership' and workspace_id='00000000-0000-0000-0000-000000000011';
insert into coach_private.workspace_teaching_assignments(id,workspace_id,membership_id,batch_id,session_id,teaching_role,teaches_from,teaches_until,access_from,access_until,feedback_write_until) values
('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000073','00000000-0000-0000-0000-000000000031',null,'lead',now()-interval '2 days',null,now()-interval '1 day',now()+interval '1 day',now()+interval '2 hours'),
('00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000074',null,'00000000-0000-0000-0000-000000000041','substitute',now()-interval '2 hours',now()+interval '1 hour',now()-interval '2 hours',now()+interval '2 hours',now()+interval '1 hour');
update coach_private.workspace_feedback_links set provenance='membership_write',author_membership_id='00000000-0000-0000-0000-000000000073' where observation_id='00000000-0000-0000-0000-000000000051';
