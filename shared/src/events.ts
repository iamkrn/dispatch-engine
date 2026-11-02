import { z } from 'zod';
import { agentSchema } from './agent.js';

export const PROTOCOL_VERSION = 1;

export const simHelloSchema = z.object({
  type: z.literal('sim.hello'),
  protocolVersion: z.literal(PROTOCOL_VERSION),
  simulatorId: z.string().min(1),
  city: z.string().min(1),
  agentCount: z.number().int().nonnegative(),
});
export type SimHello = z.infer<typeof simHelloSchema>;

export const simSnapshotSchema = z.object({
  type: z.literal('sim.snapshot'),
  tick: z.number().int().nonnegative(),
  sentAt: z.number().int().nonnegative(),
  agents: z.array(agentSchema),
});
export type SimSnapshot = z.infer<typeof simSnapshotSchema>;

// Simulator -> Server ke saare messages
export const simToServerMessageSchema = z.discriminatedUnion('type', [
  simHelloSchema,
  simSnapshotSchema,
]);
export type SimToServerMessage = z.infer<typeof simToServerMessageSchema>;