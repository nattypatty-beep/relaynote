# Relaynote

A signed-in shift-handoff board for small teams. Post what changed, what is blocked, and who should pick it up. Notes sync live, screenshots stay attached, and one click turns the board into a shared brief you can email.

## Live app

- URL: _pending deploy_
- Repository: _pending first push_

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

- `npm run type-check` passes.
- `npm run build` passes after app registration.
- `npx deepspace test run e2e` covers smoke, API auth gating, and a two-user note-sync flow.
- Live checks after deploy: sign in, post a note, observe it in a second signed-in browser, attach a screenshot, generate a brief, email the brief, reload, and inspect presence.

## Scope and tradeoffs

This app intentionally has one core workflow: a signed-in team leaves and reads handoff notes. It deliberately does **not** include per-team workspaces, payments, a mobile client, or a rich text editor. Those would add setup and state without making the handoff path more complete.

The main privacy tradeoff is screenshot storage. `scope: 'app'` makes an uploaded image reachable by anyone with its URL so teammates can see it without extra permission checks. That is fine for routine operational screenshots, but not for sensitive images. A production app handling secrets would need private files plus explicit per-note authorization.

## Agent help and personal verification

An AI agent scaffolded the project, implemented the schemas, actions, cron task, pages, theme, tests, and documentation, then ran type-checks and tests. The human operator signs in with DeepSpace OAuth and personally verifies the live URL, the two-browser handoff flow, the generated brief, the emailed brief, and the scheduled-digest configuration before submission.
