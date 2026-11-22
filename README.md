# Relaynote

A signed-in shift-handoff board for small teams. Post what changed, what is blocked, and who should pick it up. Notes sync live, screenshots stay attached, and one click turns the board into a shared brief you can email.

## Live app

- URL: https://relaynote.app.space
- Repository (DeepSpace cloud repo): `https://deploy-worker.deep.space/api/repo/app_01M80BDS09MD51VA55EH6M64M3` (`npx deepspace clone relaynote`)
- Deployed from a clean `main` branch with DeepSpace source; `npx deepspace releases` lists the immutable release ledger.

## What it does

- **Live handoff board** — notes are records in the `notes` collection and update across open browsers over DeepSpace realtime sync.
- **Server-enforced roles** — viewers cannot read the board; members can read and create notes and edit/delete only their own; admins can moderate any note.
- **Presence** — `usePresence` shows who is online and `usePresenceRoom` broadcasts typing state and a live connection indicator.
- **Screenshot attachments** — `useR2Files({ scope: 'app' })` uploads images and stores the resulting key on the note.
- **Shared AI brief** — a server action calls `openai/chat-completion`, then saves the result to the `briefs` collection so every teammate sees the same brief.
- **Email delivery** — a server action emails the latest brief to the signed-in caller through `email/send`.
- **Weekday digest** — a `CronRoom` task lists open notes and emails the owner each weekday morning in `America/New_York`.

## DeepSpace primitives used

| Primitive | Where | Why |
| --- | --- | --- |
| Records + realtime sync | `src/schemas/notes-schema.ts`, `src/pages/(app)/(protected)/home.tsx` | The shared board and its live updates |
| Presence / presence room | `src/pages/(app)/(protected)/home.tsx` | Online avatars, typing indicator, connection state |
| R2 file uploads | `useR2Files({ scope: 'app' })` in the board | Screenshot attachments shared by URL |
| `openai/chat-completion` | `src/actions/index.ts` | Generate a short handoff brief |
| `email/send` | `src/actions/index.ts`, `src/cron.ts` | Deliver the brief and the weekday digest |
| CronRoom | `src/cron.ts` | Scheduled weekday digest |
| Server actions | `src/actions/index.ts` | Owner-billed integration orchestration with a verified caller JWT |

That is six integration/primitive surfaces, well beyond the three-integration requirement.

## Local development

```sh
npm install
npx deepspace auth login
npx deepspace app init
npm run dev
```

`app init` registers the app and stamps `DEEPSPACE_APP_ID` into `wrangler.toml`. Do not commit the placeholder `__APP_ID__`.

## Verification

- `npm run type-check`, `npm run lint`, and `npm run build` pass.
- `npx deepspace test run e2e` passes: 13 tests covering smoke, API auth gating, and the two-user note-sync/typing flow.
- Live checks after deploy: signed in through the app UI, posted a note in browser A and saw it appear in browser B without reload, confirmed "Live presence connected" in both tabs, attached a screenshot and opened it from the app's file URL, generated a brief that synced to both tabs, clicked "Email me this brief" and saw "Brief sent", then deleted the test notes.
- `npx deepspace logs`, `releases`, `status`, `app source`, and `app usage` were checked after the final deploy; edge and data plane were both confirmed serving.
- The weekday cron task is declared in `src/cron.ts` and was armed by the deploy's `GET /api/auth/ok` health request; `GET /internal/cron/tasks` returned 200 in the live logs. No extra trigger email was sent just to prove execution.

## Scope and tradeoffs

This app intentionally has one core workflow: a signed-in team leaves and reads handoff notes. It deliberately does **not** include per-team workspaces, payments, a mobile client, or a rich text editor. Those would add setup and state without making the handoff path more complete.

The main privacy tradeoff is screenshot storage. `scope: 'app'` makes an uploaded image reachable by anyone with its URL so teammates can see it without extra permission checks. That is fine for routine operational screenshots, but not for sensitive images. A production app handling secrets would need private files plus explicit per-note authorization.

## Agent help and personal verification

An AI agent scaffolded the project, implemented the schemas, actions, cron task, pages, theme, tests, and documentation, then ran type-checks, lint, builds, and the browser/API test suite. The human operator completed DeepSpace OAuth and approved the paid AI-brief and email verification; both were then exercised on the live app by the agent, and the human can repeat any of those checks at the live URL.
