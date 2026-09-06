import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpOutboundService } from './http-outbound.service.js';

describe('HttpOutboundService', () => {
  let service: HttpOutboundService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new HttpOutboundService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a POST request with the JSON payload as body', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"ok":true}', { status: 200 }),
    );

    await service.send({
      targetUrl: 'https://example.com/webhook',
      payload: { foo: 'bar' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' }),
      }),
    );
  });

  it('returns the status code and response body for a successful response', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"ok":true}', { status: 200 }),
    );

    const result = await service.send({
      targetUrl: 'https://example.com/webhook',
      payload: {},
    });

    expect(result.httpStatusCode).toBe(200);
    expect(result.responseBody).toBe('{"ok":true}');
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('returns the status code as-is for a non-2xx response, without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    );

    const result = await service.send({
      targetUrl: 'https://example.com/webhook',
      payload: {},
    });

    expect(result.httpStatusCode).toBe(404);
    expect(result.responseBody).toBe('Not Found');
  });

  it('applies customHeaders, then overwrites Authorization with the authKey', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));

    await service.send({
      targetUrl: 'https://example.com/webhook',
      payload: {},
      customHeaders: { 'X-Custom': 'value', Authorization: 'Basic old' },
      authKey: 'secret-token',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(headers['X-Custom']).toBe('value');
    expect(headers['Authorization']).toBe('Bearer secret-token');
  });

  it('omits Authorization header when no authKey is provided', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));

    await service.send({
      targetUrl: 'https://example.com/webhook',
      payload: {},
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(headers['Authorization']).toBeUndefined();
  });

  it('returns a null status code and the error message on a network error', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));

    const result = await service.send({
      targetUrl: 'https://example.com/webhook',
      payload: {},
    });

    expect(result.httpStatusCode).toBeNull();
    expect(result.responseBody).toContain('fetch failed');
  });

  it('returns a null status code when the request times out', async () => {
    vi.stubEnv('HTTP_TRIGGER_TIMEOUT_MS', '10');
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        }),
    );

    const result = await service.send({
      targetUrl: 'https://example.com/webhook',
      payload: {},
    });

    expect(result.httpStatusCode).toBeNull();
    expect(result.responseBody).toContain('timeout');
  });
});
