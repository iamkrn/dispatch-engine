import { requestStatusSchema, type RequestStatus } from '@dispatch/shared';
import { describe, expect, it } from 'vitest';
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  isTerminal,
} from './stateMachine.js';

const ALL = requestStatusSchema.options;

describe('request state machine', () => {
  it('allows the happy path', () => {
    expect(canTransition('pending', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'completed')).toBe(true);
  });

  it('allows reassignment (assigned -> pending)', () => {
    expect(canTransition('assigned', 'pending')).toBe(true);
  });

  it('does not allow skipping steps', () => {
    expect(canTransition('pending', 'in_progress')).toBe(false);
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('assigned', 'completed')).toBe(false);
  });

  it('terminal states have no exits', () => {
    const terminal: RequestStatus[] = ['completed', 'cancelled', 'failed'];
    for (const from of terminal) {
      expect(isTerminal(from)).toBe(true);
      for (const to of ALL) expect(canTransition(from, to)).toBe(false);
    }
  });

  it('non-terminal states are not terminal', () => {
    expect(isTerminal('pending')).toBe(false);
    expect(isTerminal('assigned')).toBe(false);
    expect(isTerminal('in_progress')).toBe(false);
  });

  it('no state can transition to itself', () => {
    for (const s of ALL) expect(canTransition(s, s)).toBe(false);
  });

  it('assertTransition throws InvalidTransitionError', () => {
    expect(() => assertTransition('completed', 'pending')).toThrow(
      InvalidTransitionError,
    );
    expect(() => assertTransition('pending', 'assigned')).not.toThrow();
  });
});