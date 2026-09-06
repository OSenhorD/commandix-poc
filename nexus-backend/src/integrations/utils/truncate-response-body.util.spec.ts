import { describe, expect, it } from 'vitest';

import { truncateResponseBody } from '@/integrations/utils/truncate-response-body.util.js';

describe('truncateResponseBody', () => {
  it('returns the body unchanged when at or under 10 240 bytes', () => {
    const body = 'a'.repeat(10_240);

    expect(truncateResponseBody(body)).toBe(body);
  });

  it('truncates to 10 240 bytes and appends the truncation suffix', () => {
    const body = 'a'.repeat(10_240) + 'overflow';

    const result = truncateResponseBody(body);

    expect(result).toBe('a'.repeat(10_240) + '… [truncated]');
    expect(
      Buffer.byteLength(result.slice(0, -'… [truncated]'.length), 'utf8'),
    ).toBe(10_240);
  });

  it('does not split a multi-byte UTF-8 character at the truncation boundary', () => {
    const body = 'a'.repeat(10_239) + '€' + 'more text after';

    const result = truncateResponseBody(body);
    const truncatedContent = result.slice(0, -'… [truncated]'.length);

    expect(Buffer.byteLength(truncatedContent, 'utf8')).toBeLessThanOrEqual(
      10_240,
    );
    expect(truncatedContent.endsWith('a')).toBe(true);
    expect(result.endsWith('… [truncated]')).toBe(true);
  });
});
