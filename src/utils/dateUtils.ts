import { format, parseISO, subDays, isAfter, isBefore } from 'date-fns';
import type { ChartRange } from '../types';

/**
 * 格式化日期为显示格式
 * @param dateString ISO日期字符串
 * @param formatString 格式化模板
 * @returns 格式化后的日期字符串
 */
export function formatDate(dateString: string, formatString: string = 'yyyy-MM-dd'): string {
  try {
    const date = parseISO(dateString);
    return format(date, formatString);
  } catch {
    return dateString;
  }
}

/**
 * 格式化日期为显示格式（包含时间）
 * @param dateString ISO日期字符串
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(dateString: string): string {
  return formatDate(dateString, 'yyyy-MM-dd HH:mm');
}

/**
 * 获取当前日期时间的ISO字符串
 * @returns ISO格式的日期时间字符串
 */
export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

/**
 * 获取今天的日期（YYYY-MM-DD格式）
 * @returns 今天的日期字符串
 */
export function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * 根据图表范围获取起始日期
 * @param range 图表范围
 * @returns 起始日期的ISO字符串
 */
export function getStartDateForRange(range: ChartRange): string | null {
  const now = new Date();

  switch (range) {
    case '7days':
      return subDays(now, 7).toISOString();
    case '30days':
      return subDays(now, 30).toISOString();
    case '90days':
      return subDays(now, 90).toISOString();
    case 'all':
      return null; // 返回null表示不限制起始日期
    default:
      return null;
  }
}

/**
 * 检查日期是否在范围内
 * @param dateString 待检查的日期
 * @param range 图表范围
 * @returns 是否在范围内
 */
export function isDateInRange(dateString: string, range: ChartRange): boolean {
  if (range === 'all') return true;

  const date = parseISO(dateString);
  const startDate = getStartDateForRange(range);

  if (!startDate) return true;

  return isAfter(date, parseISO(startDate)) || date.getTime() === parseISO(startDate).getTime();
}

/**
 * 对日期字符串数组进行排序（升序）
 * @param dates 日期字符串数组
 * @returns 排序后的日期数组
 */
export function sortDatesAscending(dates: string[]): string[] {
  return [...dates].sort((a, b) => {
    const dateA = parseISO(a);
    const dateB = parseISO(b);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * 对日期字符串数组进行排序（降序）
 * @param dates 日期字符串数组
 * @returns 排序后的日期数组
 */
export function sortDatesDescending(dates: string[]): string[] {
  return [...dates].sort((a, b) => {
    const dateA = parseISO(a);
    const dateB = parseISO(b);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * 获取两个日期之间的天数
 * @param startDate 起始日期
 * @param endDate 结束日期
 * @returns 天数
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
