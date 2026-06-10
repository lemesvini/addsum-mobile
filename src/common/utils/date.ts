export function formatDateForInput(value: Date | string): string {
  const date =
    value instanceof Date ? value : new Date(Date.parse(String(value)));
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function parseDateInput(value: string): Date | undefined {
  const trimmed = value.trim();
  const brMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);

  let year: number;
  let month: number;
  let day: number;

  if (brMatch) {
    day = Number(brMatch[1]);
    month = Number(brMatch[2]);
    year = Number(brMatch[3]);
  } else if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) return undefined;
    const date = new Date(parsed);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export function parseDateInputToIso(value: string): string | undefined {
  const date = parseDateInput(value);
  if (!date) return undefined;

  const trimmed = value.trim();
  const brMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);

  if (brMatch || isoMatch) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(Date.UTC(year, month, day)).toISOString();
  }

  return date.toISOString();
}
