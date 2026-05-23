import type { BodyRecord, DerivedMetrics } from '../types';

/**
 * calulate net weight
 * @param weight total weight (kg)
 * @param bodyFatPercentage body fat percentage (%)
 * @returns net weight (kg)
 */
export function calculateNetWeight(
  weight: number,
  bodyFatPercentage?: number,
): number {
  if (!bodyFatPercentage || bodyFatPercentage === 0) return 0;
  return weight * ((100 - bodyFatPercentage) / 100);
}

/**
 * calulate body fat weight
 * @param weight total weight (kg)
 * @param bodyFatPercentage body fat percentage (%)
 * @returns fat weight (kg)
 */
export function calculateBodyFatWeight(
  weight: number,
  bodyFatPercentage?: number,
): number {
  if (!bodyFatPercentage || bodyFatPercentage === 0) return 0;
  return weight * (bodyFatPercentage / 100);
}

/**
 * calulate lean mass (non-fat weight)
 * @param weight total weight (kg)
 * @param bodyFatPercentage body fat percentage (%)
 * @returns lean mass (kg)
 */
export function calculateLeanMass(
  weight: number,
  bodyFatPercentage?: number,
): number {
  if (!bodyFatPercentage || bodyFatPercentage === 0) return weight;
  return weight * (1 - bodyFatPercentage / 100);
}

/**
 * calculate derived metrics for a record
 * @param record body record
 * @param height user height (cm) - optional, used for BMI calculation
 * @returns derived metrics object
 */
export function calculateDerivedMetrics(
  record: BodyRecord,
  height?: number,
): DerivedMetrics {
  return {
    bodyFatWeight: calculateBodyFatWeight(
      record.weight,
      record.body_fat_percentage,
    ),
    leanMass: calculateLeanMass(record.weight, record.body_fat_percentage),
  };
}

/**
 * calculate percentage change
 * @param oldValue old value
 * @param newValue new value
 * @returns percentage change
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number,
): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * calculate average of an array
 * @param values array of numbers
 * @returns average
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * format number to specified decimal places
 * @param value number to format
 * @param decimals number of decimal places
 * @returns formatted string
 */
export function formatNumber(
  value: number | undefined,
  decimals: number = 2,
): string {
  if (value === undefined || isNaN(value)) return '-';
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
