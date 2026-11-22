import type { CollectionSchema } from 'deepspace/schema'

/**
 * Generated shift briefs. Written by a server action (which calls the LLM),
 * so every signed-in member can read the result without being able to mint one.
 */
export const briefsSchema: CollectionSchema = {
  name: 'briefs',
  columns: [
    { name: 'text', storage: 'text', interpretation: 'plain', required: true },
    { name: 'noteCount', storage: 'number', interpretation: 'plain', required: true },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
