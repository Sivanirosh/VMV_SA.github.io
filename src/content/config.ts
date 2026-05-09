import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    status: z.enum(['planned', 'in-progress', 'completed']),
    location: z.string(),
    startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
    completedDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    coverImage: z.string(),
    stats: z.object({
      studentsServed: z.number(),
      classroomsBuilt: z.number(),
      volunteersInvolved: z.number(),
    }),
    summary: z.string(),
  }),
});

const stories = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    age: z.number(),
    location: z.string(),
    coverImage: z.string(),
    quote: z.string().max(120, 'Quote must be max ~20 words'),
    publishedDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
  }),
});

export const collections = { projects, stories };
