import { Injectable } from '@nestjs/common';

import { getHttpTriggerTimeoutMs } from './http-outbound.constants.js';

export interface HttpOutboundRequest {
  targetUrl: string;
  payload: unknown;
  customHeaders?: Record<string, string> | null;
  authKey?: string | null;
}

export interface HttpOutboundResult {
  httpStatusCode: number | null;
  responseBody: string;
  responseTimeMs: number;
}

@Injectable()
export class HttpOutboundService {
  async send(request: HttpOutboundRequest): Promise<HttpOutboundResult> {
    const headers: Record<string, string> = {
      ...request.customHeaders,
      'Content-Type': 'application/json',
    };

    if (request.authKey) {
      headers['Authorization'] = `Bearer ${request.authKey}`;
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      getHttpTriggerTimeoutMs(),
    );

    try {
      const response = await fetch(request.targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload),
        signal: controller.signal,
      });

      return {
        httpStatusCode: response.status,
        responseBody: await response.text(),
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      return {
        httpStatusCode: null,
        responseBody: isTimeout
          ? `Request timeout after ${getHttpTriggerTimeoutMs()}ms`
          : ((error as Error).message ?? 'Unknown error'),
        responseTimeMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
