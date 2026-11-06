import { z } from 'zod';
import { agentSchema } from './agent.js';
import { geoPointSchema } from './geo.js';
import { requestSchema } from './request.js';

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

export const simDispatchSchema = z.object({
  type: z.literal('sim.dispatch'),
  requestId: z.string().min(1),
  agentId: z.string().min(1),
  destination: geoPointSchema,
});

export const serverToSimMessageSchema = z.discriminatedUnion('type', [
  simDispatchSchema,
]);
export type ServerToSimMessage = z.infer<typeof serverToSimMessageSchema>;

export const agentsSnapshotSchema = z.object({
  type: z.literal('agents.snapshot'),
  tick: z.number().int().nonnegative(),
  agents: z.array(agentSchema),
});

export const requestUpdatedSchema = z.object({
  type: z.literal('request.updated'),
  request: requestSchema,
  reasons: z.array(z.string()).optional(),
});

export const serverToClientMessageSchema = z.discriminatedUnion('type', [
  agentsSnapshotSchema,
  requestUpdatedSchema,
]);
export type ServerToClientMessage = z.infer<typeof serverToClientMessageSchema>;