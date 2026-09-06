export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface NestErrorBody {
  message?: string | string[];
  error?: string;
}

/** O ValidationPipe do Nest devolve `message` como string OU array de strings. */
export function messageFromBody(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null) return fallback;

  const { message, error } = body as NestErrorBody;
  if (Array.isArray(message) && message.length > 0) return message.join(", ");
  if (typeof message === "string" && message.length > 0) return message;
  if (typeof error === "string" && error.length > 0) return error;

  return fallback;
}
