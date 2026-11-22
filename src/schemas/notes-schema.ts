import type { CollectionSchema } from 'deepspace/schema'

/**
 * A handoff note. Members can edit and resolve their own notes; admins can
 * moderate every note. The board is signed-in only, so there is no `*` rule.
 */
export const notesSchema: CollectionSchema = {
  name: 'notes',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'body', storage: 'text', interpretation: 'plain', required: true },
    {
      name: 'kind',
      storage: 'text',
      interpretation: { kind: 'select', options: ['handoff', 'blocker', 'decision', 'win'] },
      required: true,
    },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: ['open', 'resolved'] },
      required: true,
    },
    { name: 'imageKey', storage: 'text', interpretation: 'plain' },
    { name: 'imageName', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
