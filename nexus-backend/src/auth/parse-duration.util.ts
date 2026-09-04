const DURATION_PATTERN = /^(\d+)([smhd])$/;

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2]!;

  return amount * UNIT_MS[unit]!;
}

export function addDurationFromNow(value: string): Date {
  return new Date(Date.now() + parseDurationMs(value));
}
