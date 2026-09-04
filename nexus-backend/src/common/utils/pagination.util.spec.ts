import { describe, expect, it } from 'vitest';

import {
  buildMeta,
  buildPaginatedResponse,
} from '@/common/utils/pagination.util.js';

describe('buildMeta', () => {
  it('returns zero totalPages when total is 0', () => {
    expect(buildMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('computes totalPages and hasNextPage for partial last page', () => {
    expect(buildMeta(1, 20, 25)).toEqual({
      page: 1,
      limit: 20,
      total: 25,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('handles page beyond end with empty data envelope', () => {
    const meta = buildMeta(5, 20, 25);

    expect(meta).toEqual({
      page: 5,
      limit: 20,
      total: 25,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });

    expect(buildPaginatedResponse([], 5, 20, 25)).toEqual({
      data: [],
      meta,
    });
  });
});
