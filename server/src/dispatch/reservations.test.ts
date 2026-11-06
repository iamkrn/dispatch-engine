import { describe, expect, it } from 'vitest';
import { createReservations } from './reservations.js';

describe('reservations', () => {
  it('reserves and releases an agent', () => {
    const r = createReservations();
    r.reserve('a', 'r1');
    expect(r.isReserved('a')).toBe(true);
    r.release('a');
    expect(r.isReserved('a')).toBe(false);
  });

  it('releases by request id', () => {
    const r = createReservations();
    r.reserve('a', 'r1');
    r.reserve('b', 'r2');
    r.releaseByRequest('r1');
    expect(r.isReserved('a')).toBe(false);
    expect(r.isReserved('b')).toBe(true);
    expect(r.size).toBe(1);
  });
});