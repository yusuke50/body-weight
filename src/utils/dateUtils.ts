import { format, parseISO, subDays } from 'date-fns';
import type { ChartRange } from '../types';

/**
 * format timestamp to date string
 * @param timestamp target timestamp
 * @param formatString date format string (default: 'yyyy-MM-dd')
 * @returns formatted date string
 */
export function formatDate(
  dateString: string,
  formatString: string = 'yyyy-MM-dd',
): string {
  try {
    const date = new Date(dateString);
    return format(date, formatString);
  } catch {
    return new Date(dateString).toLocaleDateString();
  }
}

/**
 * format timestamp to date and time string
 * @param dateString iso date string
 * @returns formatted date and time string
 */
export function formatDateTime(dateString: string): string {
  return formatDate(dateString, 'yyyy-MM-dd HH:mm');
}

/**
 * get current date and time
 * @returns current timestamp
 */
function toLocalDateTimeString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function getCurrentDateTime(): string {
  return toLocalDateTimeString(new Date());
}

/**
 * get start date for chart range
 * @param range range type
 * @returns start date ISO string or null for 'all' range
 */
export function getStartDateForRange(range: ChartRange): string | null {
  const now = new Date();

  switch (range) {
    case '7days':
      return toLocalDateTimeString(subDays(now, 7));
    case '30days':
      return toLocalDateTimeString(subDays(now, 30));
    case '90days':
      return toLocalDateTimeString(subDays(now, 90));
    case 'all':
      return null;
    default:
      return null;
  }
}

/**
 * check if a date is within the specified chart range
 * @param dateTimeString target date
 * @param range chart range
 * @returns boolean
 */
export function isDateInRange(
  dateTimeString: string,
  range: ChartRange,
): boolean {
  if (range === 'all') return true;

  const startDate = getStartDateForRange(range);

  if (!startDate) return true;

  return dateTimeString >= startDate;
}

/**
 * sort an array of date strings in ascending order
 * @param dates date strings array
 * @returns sorted dates array
 */
export function sortDatesAscending(dates: string[]): string[] {
  return [...dates].sort((a, b) => {
    const dateA = parseISO(a);
    const dateB = parseISO(b);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * sort an array of date strings in descending order
 * @param dates date strings array
 * @returns sorted dates array
 */
export function sortDatesDescending(dates: string[]): string[] {
  return [...dates].sort((a, b) => {
    const dateA = parseISO(a);
    const dateB = parseISO(b);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * get the number of days between two dates
 * @param startDate start date
 * @param endDate end date
 * @returns number of days
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
