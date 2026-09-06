const MAX_BYTES = 10_240;
const TRUNCATION_SUFFIX = '… [truncated]';

export function truncateResponseBody(body: string): string {
  const buffer = Buffer.from(body, 'utf8');

  if (buffer.byteLength <= MAX_BYTES) {
    return body;
  }

  let end = MAX_BYTES;
  while (end > 0 && (buffer[end]! & 0xc0) === 0x80) {
    end--;
  }

  return buffer.subarray(0, end).toString('utf8') + TRUNCATION_SUFFIX;
}
