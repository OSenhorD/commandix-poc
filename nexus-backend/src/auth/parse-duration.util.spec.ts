import { describe, expect, it } from 'vitest';

import {
  addDurationFromNow,
  parseDurationMs,
} from '@/auth/parse-duration.util.js';

describe('parseDurationMs', () => {
  it('parses supported duration units', () => {
    expect(parseDurationMs('15m')).toBe(900_000);
    expect(parseDurationMs('7d')).toBe(604_800_000);
  });

  it('throws for invalid duration', () => {
    expect(() => parseDurationMs('invalid')).toThrow('Invalid duration: invalid');
  });
});

describe('addDurationFromNow', () => {
  it('returns a future date', () => {
    const before = Date.now();
    const result = addDurationFromNow('1h');

    expect(result.getTime()).toBeGreaterThan(before);
  });
});
