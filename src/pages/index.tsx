/**
 * Static front door. No auth fetch, no records socket — the board lives at
 * /home behind the signed-in layout.
 */

import { Link } from 'react-router-dom'
import { ArrowRight, Mail, Radio, Sparkles } from 'lucide-react'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'

export default function Landing() {
  return (
    <>
      <Seo
        {...seo}
        title={`${APP_NAME} — leave the next shift a clue`}
        description="Relaynote is a live handoff board for small teams. Post notes and screenshots, see who is around, and turn the board into a shared brief you can email."
      />
      <div data-testid="static-landing" className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
        />
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Radio className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
            </div>
            <Link
              to="/home"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              Sign in
            </Link>
          </header>

          <main className="flex flex-1 flex-col justify-center py-16">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Built for the handoff gap
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Your team already wrote it down.
              <span className="block text-primary">The next shift just can&apos;t find it.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Relaynote is one small board for the things that must survive a shift change: what changed,
              what is blocked, and who picks it up. Notes sync live, screenshots stay attached, and a
              single click turns the board into a brief you can email.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/home"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open the board <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <span className="text-xs text-muted-foreground">Sign in with GitHub or Google · no setup</span>
            </div>

            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: <Radio className="h-4 w-4" aria-hidden />,
                  title: 'Post once, see everywhere',
                  body: 'Notes and status changes sync across open tabs in real time. Presence shows who is reading with you.',
                },
                {
                  icon: <Sparkles className="h-4 w-4" aria-hidden />,
                  title: 'A brief, not a scroll',
                  body: 'Generate a short summary from the current board. It is saved for the team, not trapped in one chat thread.',
                },
                {
                  icon: <Mail className="h-4 w-4" aria-hidden />,
                  title: 'Deliver it where people are',
                  body: 'Email the brief to yourself, or let the weekday digest surface open notes before the morning standup.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                  <span className="mb-4 grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                    {item.icon}
                  </span>
                  <h2 className="text-sm font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </main>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-[11px] text-muted-foreground">
            <span>{APP_NAME} · a small DeepSpace app</span>
            <span>Live records · presence · attachments · AI · email</span>
          </footer>
        </div>
      </div>
    </>
  )
}
