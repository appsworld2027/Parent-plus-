# Curriculum-aware feedback and learning journeys

18 November 2026. Owner authorizes starting development: spoken Coach observations should become useful Parent feedback grounded in the child's curriculum, stage, scheduled class content and actual learning history. Existing Coach review remains mandatory. This is a new requirement, not a claim that transcription or contextual AI is live.

## First deliverable

Private candidate021, after015–020, implements immutable curriculum versions/stages/objectives, dated individual stage placements, versioned mixed-stage class plans, teacher-evidenced objective assessments and a bounded single-child context projection. A pure TypeScript request builder separates planned goals from actual evidence and requires Coach review; it makes no provider call. The existing public001–014 APIs, app UI, Parent feed and approved snapshots remain authoritative and unchanged. No owner SQL is ready to run.

One child can follow several curricula independently. Two children in one batch can have different stages. A stage move is an explicit placement decision with a reason, not proof of completing preceding objectives. A new curriculum version requires explicit placement in that version. No automatic level matching by name or ordinal.

Global workspace owner/admin publish curricula. Class managers or current assigned instructors can plan a class or place a currently eligible learner; admin management never creates teaching evidence. Only the current assigned instructor who authored an exact, recorded, single-child feedback revision may attach objective evidence to it. Evidence uses explicit `observed`, `practising`, `achieved`, or `withdrawn` states and a child-specific factual explanation. Corrections append a new assessment revision; previous records and already-shared Parent feedback are not rewritten. Broader delegated corrections are future work.

All references include workspace and curriculum version. Published content, plans, placements, assessments and request receipts are append-only. Writes recheck authority before replay, use expected revisions and pin the current plan. Dates derive from the actual class; a future class cannot be used as observed learning evidence. Evidence history for context is limited to the target child's applicable objectives, no later than the selected class, and excludes raw feedback, group notes, contact/family data and other children's records. Unknown/mismatched placement yields an explicit missing-context result, not a guessed stage. Missing context blocks only contextual AI preparation; existing plain observation/draft capture remains available so a Coach can record evidence before completing a plan.

The packet is an internal teaching projection, never a Parent endpoint or permission token. Future AI execution must reauthorize and validate the source revisions at save/review time; prompt text cannot authorize database writes. AI suggestions cannot change stage, award milestones or publish. A future separately reviewed, immutable child snapshot is the Parent journey boundary; approved guardian links and consent must be rechecked there.

## Approach and limits

Chosen engineering approach: structured PostgreSQL facts plus bounded retrieval. Replaying every conversation would increase cost, mix stale facts and risk cross-child leakage. Training a private model does not establish current permissions or accurate progress. Neither is needed for this first slice. Raw audio is not stored; keyboard dictation can later supply the observation text. Provider selection, speech capture, generated feedback, Coach curriculum/plan UI and Parent journey UI follow as separate tested slices. A conversational request log, embeddings and vector database are not prerequisites.

Thousands of students are a normal relational-data design scale, not a measured capacity claim. For illustration,1,000students ×2class updates/week ×40weeks is80,000updates/year. At an assumed2KB of text/metadata each this is about160MB before indexes, versions, backups and other records; media can dominate storage. Reuse curriculum versions, index child/curriculum/date lookups, cap each context response, paginate future timelines, and define retention/deletion and provider budgets. Load, retention and real Supabase Auth/API/Storage acceptance remain release gates.

## Requirement and evidence map

LRN-01 curriculum versions/stages; LRN-02 individual placements; LRN-03 class plans; LRN-04 evidence-backed milestones; LRN-05 bounded feedback context. Related roadmap items: M2-13/14/19/21/22/23/37/38/48. This first slice does not complete those catalogue features. Scenario evidence is maintained in `docs/LEARNING_CONTEXT_QA.md`.
