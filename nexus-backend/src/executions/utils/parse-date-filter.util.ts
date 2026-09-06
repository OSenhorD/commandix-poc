import { BadRequestException } from '@nestjs/common';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HAS_OFFSET_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;

export type DateFilterBoundary = 'start' | 'end';

export function parseDateFilter(
  value: string,
  boundary: DateFilterBoundary,
): Date {
  let normalized = value;

  if (DATE_ONLY_PATTERN.test(value)) {
    normalized = `${value}T${
      boundary === 'start' ? '00:00:00.000' : '23:59:59.999'
    }Z`;
  } else if (!HAS_OFFSET_PATTERN.test(value)) {
    normalized = `${value}Z`;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date filter: ${value}`);
  }

  return date;
}
