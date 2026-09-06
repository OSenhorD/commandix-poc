import { describe, expect, it } from 'vitest';

import { parseDateFilter } from '@/executions/utils/parse-date-filter.util.js';

describe('parseDateFilter', () => {
  it('parses a date-only "from" as the start of the UTC day', () => {
    const date = parseDateFilter('2026-01-15', 'start');

    expect(date.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('parses a date-only "to" as the end of the UTC day', () => {
    const date = parseDateFilter('2026-01-15', 'end');

    expect(date.toISOString()).toBe('2026-01-15T23:59:59.999Z');
  });

  it('keeps an explicit UTC offset as-is', () => {
    const date = parseDateFilter('2026-01-15T14:30:00-03:00', 'start');

    expect(date.toISOString()).toBe('2026-01-15T17:30:00.000Z');
  });

  it('keeps an explicit Z suffix as-is', () => {
    const date = parseDateFilter('2026-01-15T14:30:00.000Z', 'start');

    expect(date.toISOString()).toBe('2026-01-15T14:30:00.000Z');
  });

  it('treats a datetime without an offset as UTC', () => {
    const date = parseDateFilter('2026-01-15T14:30:00', 'start');

    expect(date.toISOString()).toBe('2026-01-15T14:30:00.000Z');
  });

  it('throws BadRequestException for an invalid date string', () => {
    expect(() => parseDateFilter('not-a-date', 'start')).toThrow(
      'Invalid date filter: not-a-date',
    );
  });
});
