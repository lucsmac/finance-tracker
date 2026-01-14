/**
 * Format a date to YYYY-MM-DD without timezone conversion issues
 * This prevents dates from shifting when converting to ISO string in different timezones
 *
 * @param year - The year (e.g., 2026)
 * @param month - The month (0-11, where 0 is January)
 * @param day - The day of the month (1-31)
 * @returns A date string in YYYY-MM-DD format
 */
export const formatDateLocal = (year: number, month: number, day: number): string => {
  const y = year.toString().padStart(4, '0');
  const m = (month + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Get today's date in YYYY-MM-DD format without timezone issues
 */
export const getTodayLocal = (): string => {
  const today = new Date();
  return formatDateLocal(today.getFullYear(), today.getMonth(), today.getDate());
};

/**
 * Parse a YYYY-MM-DD string and return year, month (0-11), and day
 */
export const parseDateString = (dateStr: string): { year: number; month: number; day: number } => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day };
};

/**
 * Create a Date object from a YYYY-MM-DD string without timezone issues
 * This creates a date in local timezone, not UTC
 */
export const createDateFromString = (dateStr: string): Date => {
  const { year, month, day } = parseDateString(dateStr);
  return new Date(year, month, day);
};

/**
 * Format a YYYY-MM-DD string to localized date string
 */
export const formatDateToLocaleString = (
  dateStr: string,
  locale: string = 'pt-BR',
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = createDateFromString(dateStr);
  return date.toLocaleDateString(locale, options);
};
