# Relaynote — submission notes

## Live URL

https://relaynote.app.space

## Repository URL

DeepSpace cloud repo (the app's permanent source of record):

`https://deploy-worker.deep.space/api/repo/app_01M80BDS09MD51VA55EH6M64M3`

Clone it with `npx deepspace clone relaynote`. The app ships from a clean `main` branch with DeepSpace source; `npx deepspace releases` shows the immutable release ledger.

## Scope

Relaynote is one finished workflow: a signed-in team leaves shift-handoff notes on a live board. A note has a title, body, type, status, and optional screenshot. Teammates see new notes immediately, know who is online, and can turn the board into a short shared brief. The brief can be emailed to the signed-in user, and a weekday cron emails the owner the open notes before the morning shift.

## Integrations and technical depth

1. **DeepSpace records and realtime sync** — the `notes` and `briefs` collections are the shared state; every browser sees writes over the live record subscription.
2. **Presence and a presence room** — online avatars, typing state, and connection status all come from real connected clients.
3. **R2 uploads** — screenshots are uploaded with `useR2Files({ scope: 'app' })` and the resulting key is stored on the note.
4. **`openai/chat-completion`** — a verified server action summarizes up to 60 notes and saves the result for the whole team.
5. **`email/send`** — the same verified action emails the latest brief; a cron task uses it for the weekday digest.
6. **CronRoom** — the weekday digest is a real scheduled task scoped to the app id, not a client-side timer.

Server-enforced RBAC makes the multi-user flow meaningful: viewers get nothing, members can post and manage only their own notes, and admins can moderate any note. The server action is the only path that can mint a brief or spend owner-billed integrations.

## Tradeoffs

I kept the product to one core path. There are no per-team workspaces, payments, native mobile clients, or rich text editor; each would add setup and state without making the handoff workflow more complete.

Screenshots use `scope: 'app'`, so anyone with the file URL can view them. That is a deliberate choice so teammates can see attachments without extra authorization logic, but it means Relaynote is not suitable for sensitive images. A private scope plus per-note authorization would be the next security step.

## Agent help

An AI agent scaffolded the app, implemented the data model, RBAC, board UI, presence, uploads, server actions, cron task, theme, landing page, tests, and documentation. It also ran type-checks, lint, unit tests, and browser/API tests. The human operator completed DeepSpace OAuth and personally checks the deployed app with two signed-in browsers.

## Personal verification

- [x] Signed in at the live URL (DeepSpace email sign-in as Relay Alice).
- [x] Posted a note in browser A and saw it appear in browser B without reload.
- [x] Confirmed both browsers showed as online and "Live presence connected"; two-user typing indicator verified in the Playwright suite.
- [x] Attached a screenshot and opened it from the note's app file URL.
- [x] Generated a brief and saw it saved for both browsers.
- [x] Emailed the brief and confirmed delivery to the signed-in address ("Brief sent", with matching `email/send` entry in `app usage`).
- [x] Confirmed the weekday digest task is declared in `src/cron.ts` and armed at deploy: live logs show `GET /internal/cron/tasks` 200 and the deploy's `GET /api/auth/ok` wake-up. No extra trigger email was sent just to prove execution.
- [x] Checked `releases`, `logs`, `app usage`, `status`, and `app source` after deploy; both edge and data plane confirmed serving, 13 e2e tests passing.
