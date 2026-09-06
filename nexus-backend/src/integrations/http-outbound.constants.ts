export function getHttpTriggerTimeoutMs(): number {
  return Number(process.env['HTTP_TRIGGER_TIMEOUT_MS'] ?? 30_000);
}
