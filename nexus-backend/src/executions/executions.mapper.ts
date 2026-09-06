import { asJsonObject } from '@/common/utils/as-json-object.util.js';
import type { ExecutionStatusEnum } from '@/common/enums/execution-status.enum.js';

type JsonObject = Record<string, unknown>;

export interface ExecutionListItemRecord {
  id: string;
  integrationId: string;
  status: ExecutionStatusEnum | string;
  httpStatusCode: number | null;
  responseTimeMs: number;
  executedAt: string;
}

export function toExecutionListItem(
  execution: ExecutionListItemRecord,
): ExecutionListItemRecord {
  return {
    id: execution.id,
    integrationId: execution.integrationId,
    status: execution.status,
    httpStatusCode: execution.httpStatusCode,
    responseTimeMs: execution.responseTimeMs,
    executedAt: execution.executedAt,
  };
}

export interface ExecutionRecord {
  id: string;
  integrationId: string;
  status: ExecutionStatusEnum | string;
  httpStatusCode: number | null;
  responseTimeMs: number;
  requestPayload: unknown;
  responseBody: string | null;
  executedAt: string;
}

export interface ExecutionResponse {
  id: string;
  integrationId: string;
  status: ExecutionStatusEnum | string;
  httpStatusCode: number | null;
  responseTimeMs: number;
  requestPayload: JsonObject | null;
  responseBody: string | null;
  executedAt: string;
}

export function toExecutionResponse(
  execution: ExecutionRecord,
): ExecutionResponse {
  return {
    id: execution.id,
    integrationId: execution.integrationId,
    status: execution.status,
    httpStatusCode: execution.httpStatusCode,
    responseTimeMs: execution.responseTimeMs,
    requestPayload: asJsonObject(execution.requestPayload),
    responseBody: execution.responseBody,
    executedAt: execution.executedAt,
  };
}
