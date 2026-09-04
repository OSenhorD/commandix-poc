import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { PaginationQueryDto } from './pagination-query.dto.js';

async function validateDto(plain: Record<string, unknown>) {
  const dto = plainToInstance(PaginationQueryDto, plain);
  return validate(dto);
}

describe('PaginationQueryDto', () => {
  it('uses default page and limit when omitted', () => {
    const dto = plainToInstance(PaginationQueryDto, {});

    expect(dto.resolvedPage).toBe(1);
    expect(dto.resolvedLimit).toBe(20);
    expect(dto.offset).toBe(0);
  });

  it('computes offset from page and limit', () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 3, limit: 10 });

    expect(dto.resolvedPage).toBe(3);
    expect(dto.resolvedLimit).toBe(10);
    expect(dto.offset).toBe(20);
  });

  it('coerces string query params to numbers', () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '2', limit: '50' });

    expect(dto.resolvedPage).toBe(2);
    expect(dto.resolvedLimit).toBe(50);
    expect(dto.offset).toBe(50);
  });

  it('accepts valid page and limit', async () => {
    const errors = await validateDto({ page: 1, limit: 100 });

    expect(errors).toHaveLength(0);
  });

  it('rejects page less than 1', async () => {
    const errors = await validateDto({ page: 0 });

    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it('rejects limit greater than 100', async () => {
    const errors = await validateDto({ limit: 101 });

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejects limit less than 1', async () => {
    const errors = await validateDto({ limit: 0 });

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejects non-integer page', async () => {
    const errors = await validateDto({ page: 1.5 });

    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });
});
