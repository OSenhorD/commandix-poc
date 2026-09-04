import { describe, expect, it } from 'vitest';

import { maskAuthKey } from '@/common/utils/mask-auth-key.util.js';

describe('maskAuthKey', () => {
  it('masks secret-key as ****-key per API spec', () => {
    expect(maskAuthKey('secret-key')).toBe('****-key');
  });

  it('never returns the full value', () => {
    const masked = maskAuthKey('my-super-secret-token');

    expect(masked).toBe('****-token');
    expect(masked).not.toContain('super-secret');
    expect(masked).not.toBe('my-super-secret-token');
  });

  it('uses last 4 characters when no hyphen is present', () => {
    expect(maskAuthKey('abcdefgh')).toBe('****-efgh');
  });

  it('returns null for empty or missing values', () => {
    expect(maskAuthKey(null)).toBeNull();
    expect(maskAuthKey(undefined)).toBeNull();
    expect(maskAuthKey('')).toBeNull();
  });
});
