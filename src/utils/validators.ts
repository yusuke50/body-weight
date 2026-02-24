import type { RecordFormData, ValidationResult } from '../types';

/**
 * 验证体重值
 * @param weight 体重值
 * @returns 是否有效
 */
export function isValidWeight(weight: number): boolean {
  return weight > 0 && weight < 500; // 合理范围: 0-500kg
}

/**
 * 验证百分比值
 * @param percentage 百分比值
 * @returns 是否有效
 */
export function isValidPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100;
}

/**
 * 验证肌肉量
 * @param muscleMass 肌肉量
 * @param totalWeight 总体重
 * @returns 是否有效
 */
export function isValidMuscleMass(muscleMass: number, totalWeight: number): boolean {
  return muscleMass > 0 && muscleMass <= totalWeight;
}

/**
 * 验证日期格式
 * @param dateString 日期字符串
 * @returns 是否有效
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date <= new Date();
}

/**
 * 验证表单数据
 * @param formData 表单数据
 * @returns 验证结果
 */
export function validateRecordForm(formData: RecordFormData): ValidationResult {
  const errors: { field: string; message: string }[] = [];

  // 验证日期
  if (!formData.date) {
    errors.push({ field: 'date', message: '请选择测量日期' });
  } else if (!isValidDate(formData.date)) {
    errors.push({ field: 'date', message: '日期格式无效或不能是未来日期' });
  }

  // 验证体重（必填）
  if (!formData.weight) {
    errors.push({ field: 'weight', message: '请输入体重' });
  } else {
    const weight = parseFloat(formData.weight);
    if (isNaN(weight)) {
      errors.push({ field: 'weight', message: '体重必须是有效的数字' });
    } else if (!isValidWeight(weight)) {
      errors.push({ field: 'weight', message: '体重必须在 0-500kg 之间' });
    }
  }

  // 验证体脂率（可选）
  if (formData.body_fat_percentage) {
    const bodyFat = parseFloat(formData.body_fat_percentage);
    if (isNaN(bodyFat)) {
      errors.push({ field: 'body_fat_percentage', message: '体脂率必须是有效的数字' });
    } else if (!isValidPercentage(bodyFat)) {
      errors.push({ field: 'body_fat_percentage', message: '体脂率必须在 0-100% 之间' });
    }
  }

  // 验证含水量（可选）
  if (formData.water_percentage) {
    const water = parseFloat(formData.water_percentage);
    if (isNaN(water)) {
      errors.push({ field: 'water_percentage', message: '含水量必须是有效的数字' });
    } else if (!isValidPercentage(water)) {
      errors.push({ field: 'water_percentage', message: '含水量必须在 0-100% 之间' });
    }
  }

  // 验证肌肉量（可选）
  if (formData.muscle_mass) {
    const muscleMass = parseFloat(formData.muscle_mass);
    const weight = parseFloat(formData.weight);
    if (isNaN(muscleMass)) {
      errors.push({ field: 'muscle_mass', message: '肌肉量必须是有效的数字' });
    } else if (!isNaN(weight) && !isValidMuscleMass(muscleMass, weight)) {
      errors.push({ field: 'muscle_mass', message: '肌肉量不能超过总体重' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 将表单数据转换为数字（安全转换）
 * @param value 字符串值
 * @returns 数字或undefined
 */
export function safeParseFloat(value: string): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}
