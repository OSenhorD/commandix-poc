const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

/** A API devolve timestamps ISO em UTC; aqui viram horário local do navegador. */
export function formatDateTime(isoString: string): string {
  return dateTimeFormatter.format(new Date(isoString));
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${String(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}
