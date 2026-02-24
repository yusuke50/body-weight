import type { BodyRecord, UserSettings } from '../types';
import {
  getAllRecordsFromStorage,
  saveAllRecordsToStorage,
  getAllSettingsFromStorage,
  saveAllSettingsToStorage,
} from './database';

// ========== Records CRUD Operations ==========

/**
 * 添加新记录
 */
export function addRecord(record: Omit<BodyRecord, 'id' | 'created_at'>): number {
  const records = getAllRecordsFromStorage();

  // 生成新 ID
  const newId = records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1;

  const newRecord: BodyRecord = {
    ...record,
    id: newId,
    created_at: new Date().toISOString(),
  };

  records.push(newRecord);
  saveAllRecordsToStorage(records);

  return newId;
}

/**
 * 获取所有记录
 */
export function getAllRecords(
  orderBy: 'date' | 'created_at' = 'date',
  order: 'ASC' | 'DESC' = 'DESC'
): BodyRecord[] {
  const records = getAllRecordsFromStorage();

  // 排序
  records.sort((a, b) => {
    const aValue = a[orderBy] || '';
    const bValue = b[orderBy] || '';

    if (order === 'ASC') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  return records;
}

/**
 * 根据ID获取记录
 */
export function getRecordById(id: number): BodyRecord | null {
  const records = getAllRecordsFromStorage();
  return records.find(r => r.id === id) || null;
}

/**
 * 获取指定日期范围的记录
 */
export function getRecordsByDateRange(startDate: string, endDate: string): BodyRecord[] {
  const records = getAllRecordsFromStorage();

  return records.filter(record => {
    return record.date >= startDate && record.date <= endDate;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 更新记录
 */
export function updateRecord(
  id: number,
  record: Partial<Omit<BodyRecord, 'id' | 'created_at'>>
): boolean {
  const records = getAllRecordsFromStorage();
  const index = records.findIndex(r => r.id === id);

  if (index === -1) return false;

  records[index] = {
    ...records[index],
    ...record,
  };

  saveAllRecordsToStorage(records);
  return true;
}

/**
 * 删除记录
 */
export function deleteRecord(id: number): boolean {
  const records = getAllRecordsFromStorage();
  const filtered = records.filter(r => r.id !== id);

  if (filtered.length === records.length) return false;

  saveAllRecordsToStorage(filtered);
  return true;
}

/**
 * 检查记录是否存在
 */
export function checkRecordExists(date: string, weight: number, tolerance: number = 0.1): boolean {
  const records = getAllRecordsFromStorage();

  return records.some(record => {
    return record.date === date && Math.abs(record.weight - weight) < tolerance;
  });
}

// ========== Settings Operations ==========

/**
 * 获取设置值
 */
export function getSetting(key: string): string | null {
  const settings = getAllSettingsFromStorage();
  return settings[key] !== undefined ? settings[key] : null;
}

/**
 * 设置值
 */
export function setSetting(key: string, value: string): void {
  const settings = getAllSettingsFromStorage();
  settings[key] = value;
  saveAllSettingsToStorage(settings);
}

/**
 * 获取所有设置
 */
export function getAllSettings(): UserSettings {
  const settings = getAllSettingsFromStorage();

  // 解析 JSON 值
  const parsed: any = {};
  Object.entries(settings).forEach(([key, value]) => {
    try {
      parsed[key] = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      parsed[key] = value;
    }
  });

  return parsed as UserSettings;
}

/**
 * 保存用户设置
 */
export function saveUserSettings(settings: Partial<UserSettings>): void {
  Object.entries(settings).forEach(([key, value]) => {
    if (value !== undefined) {
      setSetting(key, JSON.stringify(value));
    }
  });
}

// ========== Statistics ==========

/**
 * 获取记录总数
 */
export function getRecordCount(): number {
  return getAllRecordsFromStorage().length;
}

/**
 * 获取最新记录
 */
export function getLatestRecord(): BodyRecord | null {
  const records = getAllRecords('date', 'DESC');
  return records.length > 0 ? records[0] : null;
}

/**
 * 获取最早记录
 */
export function getFirstRecord(): BodyRecord | null {
  const records = getAllRecords('date', 'ASC');
  return records.length > 0 ? records[0] : null;
}
