import type { RequestStatus } from '@dispatch/shared';

const TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  pending: ['assigned', 'cancelled', 'failed'],
  assigned: ['in_progress', 'pending', 'cancelled', 'failed'],
  in_progress: ['completed', 'cancelled', 'failed'],
  completed: [],
  cancelled: [],
  failed: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: RequestStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: RequestStatus,
    readonly to: RequestStatus,
  ) {
    super(`Invalid request transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(from: RequestStatus, to: RequestStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}