type FilterOperators = Record<string, string | number>;

function regexFilter(value: string): FilterOperators {
  return { $regex: value.trim() };
}

function eqFilter(value: string): FilterOperators {
  return { eq: value };
}

function toApiDateString(value?: string): string | undefined {
  if (!value?.trim()) return undefined;

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
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addDateRange(
  target: Record<string, unknown>,
  field: string,
  start?: string,
  end?: string,
) {
  const range: FilterOperators = {};
  const startDate = toApiDateString(start);
  const endDate = toApiDateString(end);
  if (startDate) range.gte = startDate;
  if (endDate) range.lte = endDate;
  if (Object.keys(range).length > 0) {
    target[field] = range;
  }
}

function addNumberRange(
  target: Record<string, unknown>,
  field: string,
  min?: string,
  max?: string,
) {
  const range: FilterOperators = {};
  const minValue = parseNumber(min);
  const maxValue = parseNumber(max);
  if (minValue != null) range.gte = minValue;
  if (maxValue != null) range.lte = maxValue;
  if (Object.keys(range).length > 0) {
    target[field] = range;
  }
}

function parseNumber(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function addRegexField(
  target: Record<string, unknown>,
  field: string,
  value?: string,
) {
  if (!value?.trim()) return;
  target[field] = regexFilter(value);
}

function addEqField(
  target: Record<string, unknown>,
  field: string,
  value?: string,
) {
  if (!value) return;
  target[field] = eqFilter(value);
}

export function buildExportFiltersJson(
  entries: Record<string, unknown>,
): string | undefined {
  if (Object.keys(entries).length === 0) return undefined;
  return JSON.stringify(entries);
}

export const exportFilterHelpers = {
  addDateRange,
  addNumberRange,
  addRegexField,
  addEqField,
};
