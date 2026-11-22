import { useRef, useState } from 'react'
import {
  getAuthToken,
  getUserColor,
  useAuthProfileReady,
  useMutations,
  usePresence,
  usePresenceRoom,
  useQuery,
  useR2Files,
  useUserLookup,
} from 'deepspace'
import { Check, CircleAlert, Clock3, ImagePlus, Loader2, Mail, Sparkles, Trash2, X } from 'lucide-react'
import { Badge, Button, Input, Textarea, useToast } from '../../../components/ui'
import { cn } from '../../../lib/utils'
import { APP_NAME, SCOPE_ID } from '../../../constants'
import { Seo } from '../../../components/Seo'

type Note = {
  title: string
  body: string
  kind: 'handoff' | 'blocker' | 'decision' | 'win'
  status: 'open' | 'resolved'
  imageKey?: string
  imageName?: string
}

type Brief = { text: string; noteCount: number }

type ActionEnvelope<T> = { success: boolean; data?: T; error?: string }

async function callAction<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Sign in first')
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as ActionEnvelope<T>
  if (!res.ok || !json.success) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json.data as T
}

const KINDS: Array<{ value: Note['kind']; label: string }> = [
  { value: 'handoff', label: 'Handoff' },
  { value: 'blocker', label: 'Blocker' },
  { value: 'decision', label: 'Decision' },
  { value: 'win', label: 'Win' },
]

type Filter = 'all' | 'open' | 'blocker' | 'resolved'

export default function HomePage() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const { records: notes, status, error } = useQuery<Note>('notes', {
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })
  const { records: briefs } = useQuery<Brief>('briefs', { orderBy: 'createdAt', orderDir: 'desc', limit: 1 })
  const { ready, createConfirmed, putConfirmed, removeConfirmed } = useMutations<Note>('notes')
  const { users, isOnline } = usePresence()
  const { peers, connected, updateState } = usePresenceRoom(`${SCOPE_ID}:board`)
  const lookup = useUserLookup()
  const { success, error: showError } = useToast()
  const { upload, getUrl, isUploading } = useR2Files({ scope: 'app' })

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<Note['kind']>('handoff')
  const [image, setImage] = useState<{ key: string; name: string } | null>(null)
  const [filter, setFilter] = useState<Filter>('open')
  const [saving, setSaving] = useState(false)
  const [briefing, setBriefing] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const latestBrief = briefs[0]
  const openCount = notes.filter((n) => n.data.status === 'open').length
  const online = users.filter((u) => isOnline(u.id))
  const typers = peers.filter((p) => p.state.typing === true).map((p) => p.userName)
  const visible = notes.filter((n) => {
    if (filter === 'open') return n.data.status === 'open'
    if (filter === 'resolved') return n.data.status === 'resolved'
    if (filter === 'blocker') return n.data.kind === 'blocker' && n.data.status === 'open'
    return true
  })

  function onBodyChange(value: string) {
    setBody(value)
    updateState({ typing: value.length > 0 })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => updateState({ typing: false }), 1600)
  }

  async function onAttach(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showError('Unsupported file', 'Attachments must be images.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('Image too large', 'Keep attachments under 5 MB.')
      return
    }
    const result = await upload(file, file.name)
    if (!result.success || !result.key) {
      showError('Upload failed', result.error ?? 'Try again.')
      return
    }
    setImage({ key: result.key, name: file.name })
    success('Screenshot attached')
  }

  async function addNote() {
    if (!title.trim() || !body.trim() || saving) return
    setSaving(true)
    try {
      await createConfirmed({
        title: title.trim(),
        body: body.trim(),
        kind,
        status: 'open',
        imageKey: image?.key,
        imageName: image?.name,
      })
      setTitle('')
      setBody('')
      setImage(null)
      updateState({ typing: false })
      success('Note posted', 'Everyone on the board can see it now.')
    } catch (e) {
      showError('Could not post note', e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(note: (typeof notes)[number]) {
    const next = note.data.status === 'open' ? 'resolved' : 'open'
    try {
      await putConfirmed(note.recordId, { status: next })
      success(next === 'resolved' ? 'Note resolved' : 'Note reopened')
    } catch (e) {
      showError('Could not update note', e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteNote(note: (typeof notes)[number]) {
    try {
      await removeConfirmed(note.recordId)
      success('Note deleted')
    } catch (e) {
      showError('Could not delete note', e instanceof Error ? e.message : String(e))
    }
  }

  async function generateBrief() {
    if (briefing) return
    setBriefing(true)
    try {
      const result = await callAction<{ noteCount: number }>('generateBrief')
      success('Brief generated', `${result.noteCount} notes summarized for the team.`)
    } catch (e) {
      showError('Could not generate brief', e instanceof Error ? e.message : String(e))
    } finally {
      setBriefing(false)
    }
  }

  async function emailBrief() {
    if (emailing) return
    setEmailing(true)
    try {
      const result = await callAction<{ to: string }>('emailBrief')
      success('Brief sent', `Delivered to ${result.to}.`)
    } catch (e) {
      showError('Could not email brief', e instanceof Error ? e.message : String(e))
    } finally {
      setEmailing(false)
    }
  }

  return (
    <>
      <Seo
        title={`Handoff board · ${APP_NAME}`}
        description="A live shift handoff board for small teams: post notes, share screenshots, and generate a brief."
        path="/home"
      />
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Shared shift board
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Leave the next shift a clue.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Post what changed, what is stuck, and what someone needs to pick up. Everything syncs live.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex -space-x-2">
              {online.slice(0, 5).map((u) => (
                <span
                  key={u.id}
                  title={`${u.name} · online`}
                  className="grid h-7 w-7 place-items-center rounded-full border-2 border-card text-[10px] font-semibold text-background"
                  style={{ backgroundColor: getUserColor(u.id) }}
                >
                  {(u.name || '?').slice(0, 1).toUpperCase()}
                </span>
              ))}
              {online.length === 0 && <span className="text-xs text-muted-foreground">Just you for now</span>}
            </div>
            {online.length > 0 && (
              <span data-testid="presence-online" className="text-xs text-muted-foreground">
                {online.length} online
              </span>
            )}
            <span
              className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-success' : 'bg-muted-foreground')}
              title={connected ? 'Live presence connected' : 'Presence connecting'}
            />
          </div>
        </header>

        {typers.length > 0 && (
          <p className="mb-3 text-xs text-primary" aria-live="polite">
            {typers.join(', ')} {typers.length === 1 ? 'is' : 'are'} writing a note…
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.16)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                </span>
                <h2 className="text-sm font-semibold text-foreground">New note</h2>
              </div>
              <div className="space-y-3">
                <Input
                  data-testid="note-title-input"
                  aria-label="Note title"
                  placeholder="What should the next person know?"
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  data-testid="note-body-input"
                  aria-label="Note body"
                  placeholder="Add the context: what happened, what is pending, who owns the next step."
                  value={body}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => onBodyChange(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Note type"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as Note['kind'])}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                  <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground hover:text-foreground">
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    {isUploading ? 'Uploading…' : 'Screenshot'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => void onAttach(e.target.files?.[0])}
                    />
                  </label>
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                    >
                      <span className="max-w-[120px] truncate">{image.name}</span>
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  )}
                  <div className="flex-1" />
                  <Button
                    data-testid="note-submit"
                    onClick={() => void addNote()}
                    disabled={!ready || saving || !title.trim() || !body.trim()}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    {saving ? 'Posting…' : 'Post note'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['open', `Open (${openCount})`],
                  ['blocker', 'Blockers'],
                  ['resolved', 'Resolved'],
                  ['all', 'All'],
                ] as Array<[Filter, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      filter === value
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {notes.length} note{notes.length === 1 ? '' : 's'} on board
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {status === 'loading' && (
                <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  Connecting to the board…
                </p>
              )}
              {status === 'error' && (
                <p role="alert" className="rounded-lg border border-destructive/50 bg-card p-6 text-center text-sm text-destructive">
                  {error ?? 'Could not load notes.'}
                </p>
              )}
              {status === 'ready' && visible.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nothing here yet. Post a note above, or switch filters.
                </p>
              )}
              {visible.map((note) => {
                const data = note.data
                const isOwn = note.createdBy === user?.id
                const canEdit = isOwn || user?.role === 'admin'
                return (
                  <article
                    key={note.recordId}
                    data-testid="note-card"
                    className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.12)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={data.kind === 'blocker' ? 'destructive' : 'secondary'}>
                        {data.kind === 'blocker' && <CircleAlert className="mr-1 h-3 w-3" aria-hidden />}
                        {KINDS.find((k) => k.value === data.kind)?.label ?? data.kind}
                      </Badge>
                      {data.status === 'resolved' && (
                        <Badge variant="outline"><Check className="mr-1 h-3 w-3" aria-hidden />Resolved</Badge>
                      )}
                      <span className="flex-1" />
                      <span className="text-[11px] text-muted-foreground">
                        {lookup.getName(note.createdBy) ?? 'Teammate'} ·{' '}
                        {new Date(note.createdAt).toLocaleString([], {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <h3 data-testid="note-title" className="mt-3 text-sm font-semibold text-foreground">
                      {data.title}
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {data.body}
                    </p>
                    {data.imageKey && (
                      <a href={getUrl(data.imageKey)} target="_blank" rel="noreferrer" className="mt-3 block">
                        <img
                          src={getUrl(data.imageKey)}
                          alt={data.imageName ?? 'Screenshot attachment'}
                          className="max-h-56 w-full rounded-lg border border-border object-cover"
                        />
                        <span className="mt-1 inline-block text-[11px] text-muted-foreground underline-offset-2 hover:underline">
                          {data.imageName ?? 'Open screenshot'} ↗
                        </span>
                      </a>
                    )}
                    {canEdit && (
                      <div className="mt-3 flex gap-2 border-t border-border pt-3">
                        <Button variant="ghost" size="sm" onClick={() => void toggleStatus(note)}>
                          {data.status === 'open' ? 'Mark resolved' : 'Reopen'}
                        </Button>
                        {isOwn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => void deleteNote(note)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">Shift brief</h2>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Summarize the board into a short, shared brief your team can read or email.
              </p>
              <Button className="w-full" onClick={() => void generateBrief()} disabled={briefing || notes.length === 0}>
                {briefing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                {briefing ? 'Writing…' : 'Generate brief'}
              </Button>
              {latestBrief ? (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" aria-hidden />
                    From {latestBrief.data.noteCount} notes
                  </p>
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                    {latestBrief.data.text}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => void emailBrief()}
                    disabled={emailing}
                  >
                    {emailing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
                    {emailing ? 'Sending…' : 'Email me this brief'}
                  </Button>
                </div>
              ) : (
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  No brief yet. Post a note, then generate one.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
              <h2 className="mb-2 text-sm font-semibold text-foreground">How this works</h2>
              <p>Notes, screenshots and briefs are shared across everyone signed in here. Resolve an item when the next shift has it.</p>
              <p className="mt-2">Your own notes can be edited or deleted; an app admin can moderate any note.</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
