import type { ExecutionStatusEnum } from '@/common/enums/execution-status.enum.js';

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
