import type { BodyRecord, DerivedMetrics } from '../types';

/**
 * 计算体脂肪重量
 * @param weight 总体重 (kg)
 * @param bodyFatPercentage 体脂率 (%)
 * @returns 体脂肪重量 (kg)
 */
export function calculateBodyFatWeight(weight: number, bodyFatPercentage?: number): number {
  if (!bodyFatPercentage || bodyFatPercentage === 0) return 0;
  return weight * (bodyFatPercentage / 100);
}

/**
 * 计算瘦体重（非脂肪重量）
 * @param weight 总体重 (kg)
 * @param bodyFatPercentage 体脂率 (%)
 * @returns 瘦体重 (kg)
 */
export function calculateLeanMass(weight: number, bodyFatPercentage?: number): number {
  if (!bodyFatPercentage || bodyFatPercentage === 0) return weight;
  return weight * (1 - bodyFatPercentage / 100);
}

/**
 * 计算 BMI
 * @param weight 体重 (kg)
 * @param height 身高 (cm)
 * @returns BMI值
 */
export function calculateBMI(weight: number, height?: number): number | undefined {
  if (!height || height === 0) return undefined;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

/**
 * 计算记录的所有派生指标
 * @param record 身体记录
 * @param height 用户身高 (cm) - 可选，用于计算BMI
 * @returns 派生指标对象
 */
export function calculateDerivedMetrics(
  record: BodyRecord,
  height?: number
): DerivedMetrics {
  return {
    bodyFatWeight: calculateBodyFatWeight(record.weight, record.body_fat_percentage),
    leanMass: calculateLeanMass(record.weight, record.body_fat_percentage),
    bmi: calculateBMI(record.weight, height),
  };
}

/**
 * 计算变化百分比
 * @param oldValue 旧值
 * @param newValue 新值
 * @returns 变化百分比
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * 计算数组的平均值
 * @param values 数值数组
 * @returns 平均值
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * 格式化数字为指定小数位
 * @param value 数值
 * @param decimals 小数位数
 * @returns 格式化后的字符串
 */
export function formatNumber(value: number | undefined, decimals: number = 1): string {
  if (value === undefined || isNaN(value)) return '-';
  return value.toFixed(decimals);
}
