export function getBootstrapThrottleTtl(): number {
  return Number(process.env['BOOTSTRAP_THROTTLE_TTL'] ?? 60_000);
}

export function getBootstrapThrottleLimit(): number {
  return Number(process.env['BOOTSTRAP_THROTTLE_LIMIT'] ?? 5);
}
