import { z } from 'zod';
import { geoPointSchema } from './geo.js';

export const agentTypeSchema = z.enum(['ambulance', 'cab']);
export type AgentType = z.infer<typeof agentTypeSchema>;

export const agentStatusSchema = z.enum(['available', 'busy', 'offline']);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const agentSchema = z.object({
  id: z.string().min(1),
  type: agentTypeSchema,
  status: agentStatusSchema,
  location: geoPointSchema,
  speedKmh: z.number().nonnegative(),
  capacity: z.number().int().min(1),
  currentLoad: z.number().int().min(0),
  lastUpdateAt: z.number().int().nonnegative(),
});

export type Agent = z.infer<typeof agentSchema>;
