import { z } from 'zod';
import { agentTypeSchema } from './agent.js';
import { geoPointSchema } from './geo.js';
import { tenantIdSchema } from './tenant.js';

export const requestPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
export type RequestPriority = z.infer<typeof requestPrioritySchema>;

export const requestStatusSchema = z.enum([
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'failed',
]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const requestSchema = z.object({
    id: z.string().min(1),
  tenantId: tenantIdSchema,
  requiredType: agentTypeSchema,
  priority: requestPrioritySchema,
  status: requestStatusSchema,
  location: geoPointSchema,
  requiredCapacity: z.number().int().min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  assignedAgentId: z.string().min(1).nullable(),
});

export type Request = z.infer<typeof requestSchema>;

export const createRequestBodySchema = z.strictObject({
  requiredType: agentTypeSchema,
  priority: requestPrioritySchema,
  location: geoPointSchema,
  requiredCapacity: z.number().int().min(1).max(20).default(1),
});

export type CreateRequestBody = z.infer<typeof createRequestBodySchema>;