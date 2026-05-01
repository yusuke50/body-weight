import type { BodyRecord, UserSettings } from '../types';
import {
  getAllRecordsFromStorage,
  saveAllRecordsToStorage,
  getAllSettingsFromStorage,
  saveAllSettingsToStorage,
} from './database';

/**
 * add a new record and return the new record ID
 */
export function addRecord(
  record: Omit<BodyRecord, 'id' | 'created_at'>,
): number {
  const records = getAllRecordsFromStorage();

  const newId =
    records.length > 0 ? Math.max(...records.map((r) => r.id || 0)) + 1 : 1;

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
 * get all records with optional sorting
 */
export function getAllRecords(
  orderBy: 'date' | 'created_at' = 'date',
  order: 'ASC' | 'DESC' = 'DESC',
): BodyRecord[] {
  const records = getAllRecordsFromStorage();

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
 * get record by ID
 */
export function getRecordById(id: number): BodyRecord | null {
  const records = getAllRecordsFromStorage();
  return records.find((r) => r.id === id) || null;
}

/**
 * get records by date range
 */
export function getRecordsByDateRange(
  startDate: string,
  endDate: string,
): BodyRecord[] {
  const records = getAllRecordsFromStorage();

  return records
    .filter((record) => {
      return record.date >= startDate && record.date <= endDate;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * update a record
 */
export function updateRecord(
  id: number,
  record: Partial<Omit<BodyRecord, 'id' | 'created_at'>>,
): boolean {
  const records = getAllRecordsFromStorage();
  const index = records.findIndex((r) => r.id === id);

  if (index === -1) return false;

  records[index] = {
    ...records[index],
    ...record,
  };

  saveAllRecordsToStorage(records);
  return true;
}

/**
 * delete a record
 */
export function deleteRecord(id: number): boolean {
  const records = getAllRecordsFromStorage();
  const filtered = records.filter((r) => r.id !== id);

  if (filtered.length === records.length) return false;

  saveAllRecordsToStorage(filtered);
  return true;
}

/**
 * check if a record exists
 */
export function checkRecordExists(
  date: string,
  weight: number,
  tolerance: number = 0.1,
): boolean {
  const records = getAllRecordsFromStorage();

  return records.some((record) => {
    return record.date === date && Math.abs(record.weight - weight) < tolerance;
  });
}

/**
 * get a setting value
 */
export function getSetting(key: string): string | null {
  const settings = getAllSettingsFromStorage();
  return settings[key] !== undefined ? settings[key] : null;
}

/**
 * set a setting value
 */
export function setSetting(key: string, value: string): void {
  const settings = getAllSettingsFromStorage();
  settings[key] = value;
  saveAllSettingsToStorage(settings);
}

/**
 * get all settings
 */
export function getAllSettings(): UserSettings {
  const settings = getAllSettingsFromStorage();

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
 * get record count
 */
export function getRecordCount(): number {
  return getAllRecordsFromStorage().length;
}

/**
 * get latest record
 */
export function getLatestRecord(): BodyRecord | null {
  const records = getAllRecords('date', 'DESC');
  return records.length > 0 ? records[0] : null;
}

/**
 * get first record
 */
export function getFirstRecord(): BodyRecord | null {
  const records = getAllRecords('date', 'ASC');
  return records.length > 0 ? records[0] : null;
}
