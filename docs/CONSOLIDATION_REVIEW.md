# ParentPlus consolidation review

**Stage B working branch:** `MM/parentplus-consolidation-20261117`  
**Destination baseline:** `codex/coach-foundation` at `df472c76194824e4869651725683f0f80ff83cab`

## Decision

Keep the destination Expo/React Native app and its Supabase project as the target. The parent and coach journeys are already integrated there, and the destination has current passing app checks and Android preview builds. The source Next.js app is useful evidence about product workflows, but its UI is not a direct fit for the mobile-first target.

Keep destination migrations 001–014 and its academy/student/family/guardian model as the canonical live history and model. Evolve that model through reviewed, destination-native migrations. Do not import source migration history or data wholesale. The private 015 workspace foundation remains an isolated candidate; it is not live.

## Adopt, retain, defer

- **Adopt selectively:** source workspace/membership concepts and stronger documented engineering/quality practices where they fit the destination.
- **Retain:** Coach and Aurora Parent workspaces, destination-specific consent and reviewed-feedback flows, verified guardian email, explicit Coach approval, and tenant/privacy boundaries.
- **Defer:** source Next.js UI and source-only parent attendance/report features until the destination roadmap prioritizes them.
- **Defer:** GitLab and Vercel review, as requested.

## Review limits

This pass changes repository guidance only; it does not change app code, schemas, live data, production settings, or either source repository. Supabase advisor findings about SECURITY DEFINER functions and password protection remain review items for a later security-focused pass. GitHub branch protection could not be confirmed through available metadata; do not assume required checks are enforced.
