/**
 * Per-app CronRoom tasks. Declared here, dispatched by worker.ts.
 */

import type { CronTask } from 'deepspace/worker'
import { buildCronContext } from 'deepspace/worker'
import type { Env } from '../worker'

type Note = { title: string; body: string; kind: string }

export const tasks: CronTask[] = [
  { name: 'morning-digest', schedule: '0 9 * * 1-5', timezone: 'America/New_York' },
]

/** Emails the owner a plain-text list of open notes each weekday morning. */
export async function runTask(name: string, env: Env): Promise<void> {
  if (name !== 'morning-digest') return

  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.DEEPSPACE_APP_ID}`)
  const notes = (await ctx.records.query('notes', {
    where: { status: 'open' },
    limit: 50,
  })) as Array<{ data: Note }>
  if (notes.length === 0) return

  const ownerRows = (await ctx.records.query('users', {
    where: { recordId: env.OWNER_USER_ID },
    limit: 1,
  })) as Array<{ data: { email?: string } }>
  const email = ownerRows[0]?.data.email
  if (!email) return

  const lines = notes.map((note) => {
    const data = note.data
    const detail = (data.body ?? '').replace(/\s+/g, ' ').slice(0, 160)
    return `- [${data.kind}] ${data.title}: ${detail}`
  })

  await ctx.integrations.call('email/send', {
    from: 'Relaynote <relaynote@app.space>',
    to: email,
    subject: `Relaynote: ${notes.length} open handoff note${notes.length === 1 ? '' : 's'}`,
    text: `Good morning. These notes are still open on your Relaynote board:\n\n${lines.join('\n')}\n\nOpen the app to resolve or reply.`,
  })
}
