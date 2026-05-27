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
 * calculate FFMI
 * @param weight total weight (kg)
 * @param bodyFatPercentage body fat percentage (%)
 * @param height user height (cm)
 * @param type 'default' or 'adjusted'
 * @returns FFMI value
 */
export function calculateFFMI(
  weight: number,
  bodyFatPercentage: number,
  height: number,
  type?: 'default' | 'adjusted',
): number {
  height = height || 180;
  const leanMass = calculateNetWeight(weight, bodyFatPercentage);
  const heightInMeters = height / 100;
  const FFMI = leanMass / (heightInMeters * heightInMeters);
  const adjustedFFMI = FFMI + 6 * (1.8 - heightInMeters);
  return type === 'adjusted' ? adjustedFFMI : FFMI;
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
