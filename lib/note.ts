import { z } from 'zod';
export const noteInput = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(200000).refine(s => new TextEncoder().encode(s).length <= 500000, 'Notes must be under 500 KB of text.'),
  kind: z.enum(['note','pdf','audio']).default('note'),
  folder: z.string().trim().min(1).max(100).default('Unsorted'),
  size: z.string().max(30).default('1 KB'),
  starred: z.boolean().default(false),
});
export const notePatch = noteInput.partial().extend({ id: z.string().uuid() }).strict();
export type Note = z.infer<typeof noteInput> & { id: string; createdAt?: string; updatedAt: string; revision?: number };
export const validId = z.string().uuid();
