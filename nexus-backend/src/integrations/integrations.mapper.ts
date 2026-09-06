import { maskAuthKey } from '@/common/utils/mask-auth-key.util.js';
import type { ExecutionStatusEnum } from '@/common/enums/execution-status.enum.js';
import type { IntegrationTypeEnum } from '@/common/enums/integration-type.enum.js';

type JsonObject = Record<string, unknown>;

export interface IntegrationRecord {
  id: string;
  name: string;
  type: IntegrationTypeEnum | string;
  targetUrl: string;
  authKey: string | null;
  customHeaders: unknown;
  defaultPayload: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationListItem {
  id: string;
  name: string;
  type: IntegrationTypeEnum | string;
  targetUrl: string;
  authKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationResponse {
  id: string;
  name: string;
  type: IntegrationTypeEnum | string;
  targetUrl: string;
  authKey: string | null;
  customHeaders: JsonObject | null;
  defaultPayload: JsonObject | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

function asJsonObject(value: unknown): JsonObject | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
}

export function toIntegrationListItem(
  integration: IntegrationListItem,
): IntegrationListItem {
  return {
    id: integration.id,
    name: integration.name,
    type: integration.type,
    targetUrl: integration.targetUrl,
    authKey: maskAuthKey(integration.authKey),
    isActive: integration.isActive,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}

export function toIntegrationResponse(
  integration: IntegrationRecord,
): IntegrationResponse {
  return {
    id: integration.id,
    name: integration.name,
    type: integration.type,
    targetUrl: integration.targetUrl,
    authKey: maskAuthKey(integration.authKey),
    customHeaders: asJsonObject(integration.customHeaders),
    defaultPayload: asJsonObject(integration.defaultPayload),
    isActive: integration.isActive,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
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
