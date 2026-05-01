import type { RecordFormData, ValidationResult } from '../types';

/**
 * weight validation
 * @param weight weight value
 * @returns whether valid
 */
export function isValidWeight(weight: number): boolean {
  return weight > 0 && weight < 500;
}

/**
 * percentage validation
 * @param percentage percentage value
 * @returns whether valid
 */
export function isValidPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100;
}

/**
 * muscle mass validation
 * @param muscleMass muscle mass value
 * @param totalWeight total weight value
 * @returns whether valid
 */
export function isValidMuscleMass(
  muscleMass: number,
  totalWeight: number,
): boolean {
  return muscleMass > 0 && muscleMass <= totalWeight;
}

/**
 * date validation
 * @param dateString date string
 * @returns boolean
 */
export function isValidDate(dateString: string): boolean {
  const dateTimestamp = new Date(dateString).getTime();

  return !isNaN(dateTimestamp) && dateTimestamp <= new Date().getTime();
}

/**
 * form validation for record form
 * @param formData formData
 * @returns validation result
 */
export function validateRecordForm(formData: RecordFormData): ValidationResult {
  const errors: { field: string; message: string }[] = [];

  if (!formData.date) {
    errors.push({ field: 'date', message: 'Select a date' });
  } else if (!isValidDate(formData.date)) {
    errors.push({ field: 'date', message: 'Invalid date or future date' });
  }

  if (!formData.weight) {
    errors.push({ field: 'weight', message: 'Enter a weight' });
  } else {
    const weight = parseFloat(formData.weight);
    if (isNaN(weight)) {
      errors.push({
        field: 'weight',
        message: 'Weight must be a valid number',
      });
    } else if (!isValidWeight(weight)) {
      errors.push({
        field: 'weight',
        message: 'Weight must be between 0 and 500kg',
      });
    }
  }

  if (formData.body_fat_percentage) {
    const bodyFat = parseFloat(formData.body_fat_percentage);
    if (isNaN(bodyFat)) {
      errors.push({
        field: 'body_fat_percentage',
        message: 'Body fat percentage must be a valid number',
      });
    } else if (!isValidPercentage(bodyFat)) {
      errors.push({
        field: 'body_fat_percentage',
        message: 'Body fat percentage must be between 0 and 100%',
      });
    }
  }

  if (formData.water_percentage) {
    const water = parseFloat(formData.water_percentage);
    if (isNaN(water)) {
      errors.push({
        field: 'water_percentage',
        message: 'Water percentage must be a valid number',
      });
    } else if (!isValidPercentage(water)) {
      errors.push({
        field: 'water_percentage',
        message: 'Water percentage must be between 0 and 100%',
      });
    }
  }

  if (formData.muscle_mass) {
    const muscleMass = parseFloat(formData.muscle_mass);
    const weight = parseFloat(formData.weight);
    if (isNaN(muscleMass)) {
      errors.push({
        field: 'muscle_mass',
        message: 'Muscle mass must be a valid number',
      });
    } else if (!isNaN(weight) && !isValidMuscleMass(muscleMass, weight)) {
      errors.push({
        field: 'muscle_mass',
        message: 'Muscle mass cannot exceed total weight',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * parse float value from string, return undefined if invalid
 * @param value string value
 * @returns number or undefined
 */
export function safeParseFloat(value: string): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}
