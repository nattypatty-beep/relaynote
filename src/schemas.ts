/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { settingsSchema } from './schemas/admin-schema'
import { briefsSchema } from './schemas/briefs-schema'
import { notesSchema } from './schemas/notes-schema'
import { usersSchema } from './schemas/users-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  notesSchema,
  briefsSchema,
]
