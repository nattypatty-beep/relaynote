import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'

type Note = {
  title: string
  body: string
  kind: string
  status: string
  imageName?: string
}

type ChatCompletion = {
  choices?: Array<{ message?: { content?: string } }>
}

const MAX_NOTES = 60

function noteLines(notes: Note[]): string {
  return notes
    .map((note, i) => {
      const detail = note.body.trim().replace(/\s+/g, ' ')
      const attachment = note.imageName ? ` Attachment: ${note.imageName}.` : ''
      return `${i + 1}. [${note.kind}/${note.status}] ${note.title}: ${detail}${attachment}`
    })
    .join('\n')
}

/**
 * Turns the current board into a short handoff brief with an owner-billed LLM
 * call, then saves it to a shared collection so every teammate sees the same
 * result over the normal record subscription.
 */
export const generateBrief: ActionHandler<Env> = async ({ tools }) => {
  const notesResult = await tools.query<Note>('notes', {
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: MAX_NOTES,
  })
  if (!notesResult.success) return { success: false, error: notesResult.error }
  const notes = notesResult.data.records.map((record) => record.data)
  if (notes.length === 0) return { success: false, error: 'Add a note before generating a brief.' }

  const completion = await tools.integration<ChatCompletion>('openai/chat-completion', {
    model: 'gpt-5.4-mini',
    max_tokens: 600,
    messages: [
      {
        role: 'system',
        content: [
          'You write shift handoff briefs for a small team.',
          'Use plain text with three short sections: "Needs attention", "Decisions & wins", "Next steps".',
          'Only use facts from the notes. If a section has nothing, write "None".',
          'Keep the whole brief under 180 words. Do not invent owners or deadlines.',
        ].join(' '),
      },
      {
        role: 'user',
        content: `Handoff notes (newest first):\n${noteLines(notes)}`,
      },
    ],
  })
  if (!completion.success) return { success: false, error: completion.error }
  const text = completion.data.choices?.[0]?.message?.content?.trim()
  if (!text) return { success: false, error: 'The model returned an empty brief. Try again.' }

  const saved = await tools.create('briefs', { text, noteCount: notes.length })
  if (!saved.success) return { success: false, error: saved.error }
  return { success: true, data: { text, noteCount: notes.length, recordId: saved.data.recordId } }
}

/**
 * Emails the most recent shared brief to the signed-in caller. The owner pays
 * for `email/send`; the recipient is the verified caller's own users row.
 */
export const emailBrief: ActionHandler<Env> = async ({ userId, tools }) => {
  const userResult = await tools.get<{ email?: string }>('users', userId)
  if (!userResult.success) return { success: false, error: 'Your profile is not ready yet.' }
  const to = userResult.data.record.data.email
  if (!to) return { success: false, error: 'No email address is attached to your profile.' }

  const briefResult = await tools.query<{ text: string; noteCount: number }>('briefs', {
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 1,
  })
  if (!briefResult.success) return { success: false, error: briefResult.error }
  const latest = briefResult.data.records[0]
  if (!latest) return { success: false, error: 'Generate a brief first.' }

  const sent = await tools.integration('email/send', {
    from: 'Relaynote <relaynote@app.space>',
    to,
    subject: 'Your Relaynote handoff brief',
    reply_to: to,
    text: `${latest.data.text}\n\n— Relaynote · ${latest.data.noteCount} notes summarized`,
  })
  if (!sent.success) return { success: false, error: sent.error }
  return { success: true, data: { to } }
}

export const actions: Record<string, ActionHandler<Env>> = {
  generateBrief,
  emailBrief,
}
