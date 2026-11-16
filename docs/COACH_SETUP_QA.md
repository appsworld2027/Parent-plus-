# Focused hosted onboarding flow QA — 0.9.0

Date:16 November2026UTC. Source:`ccb5d246a5a070ca007a64b64c80e6702df27ff6`.
Deployment:https://vercel.com/appsworld2027/parent-plus-varcel/36i56us5pPXXd3Mx7eGuG4SCfJJd

**7/7 hosted onboarding cases pass**,0 failures,skips or flaky results. Start02:57:13.058UTC; duration22.850seconds. No old browser suite was repeated. A private temporary copy changed only imports, screenshot capture/scrolling and dismissal of the old sign-in notification; canonical test assertions/actions were retained.

Verified on the actual Vercel app with fictional transport:

1. Fresh Today shows0students/0batches and the setup CTA; create a batch before selecting a photo; name,age,proficiency and guardian fields populate automatically; create another batch during review without losing fields; change the dropdown; confirm once; see success and correct batch/profile; reload preserves profiles,memberships and actual Today counts.
2. Unknown save locks the review/dropdown and retries an identical request without another scan or duplicate profiles.
3. Confirmed save plus failed roster refresh stays on success with disabled profile/batch navigation; Refresh saved profiles retries only reading, never re-importing.
4. Cancelled photo selection and failed scan retain the created batch; manual student entry remains usable.
5. Existing-profile linking adds the selected membership without changing original age,proficiency or guardian and retains the earlier batch.
6. Simple names-only OCR populates review automatically, with missing age/details blank and no second scan request.
7. Monthly quota refusal saves nothing and retains manual entry.

## Runtime and minimal real smoke

Served manifest0.9.0. Asset:`/_expo/static/js/web/index-d011f0b5aa0b437588800f9d8d1f4840.js`.
SHA-256:`dd840ace7ba2a9e624235866a426db387f18570774ed1a36a5e4ccc99f913189`.

Phone sign-in and direct recovery route return HTTP200; invalid email/empty password are rejected locally. No horizontal overflow/page exceptions. Today setup/review and cloud-vision-v1 markers are in the served bundle. Google provider endpoint/key-header code is absent from the client; focused GoogleAPI-key-format,Supabase-secret-format and private-key-PEM scans have0matches.

No real backend,Google/function,SQL or paid recognition calls were made. The existing live backend was left unchanged; this repair does not request a SQL/function redeployment. Fixture success does not claim real-register/provider accuracy or native phone acceptance.

## Visual evidence

- images/090-today-setup.png: first-step setup with actual empty-roster counts.
- images/090-review.png: recognized name,age,proficiency and guardian details before confirmation.
- images/090-setup-saved.png: explicit2students saved outcome and working batch/profile navigation.
- images/090-setup-profile.png: imported profile age/proficiency and guardian details.

All four were captured during the first case and visually inspected. Names/contacts are fictional. Sanitized results/smoke reports/screenshots are preserved; temporary capability,cookie,state,config and screenshot-only test files are removed afterward (cleanup.json). No tracked source was edited during hosted QA.
