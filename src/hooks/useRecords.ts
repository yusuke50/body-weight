import { useState, useEffect, useCallback } from 'react';
import type { BodyRecord, ChartRange } from '../types';
import {
  getAllRecords,
  addRecord as addRecordService,
  updateRecord as updateRecordService,
  deleteRecord as deleteRecordService,
} from '../services/dataService';
import { isDateInRange } from '../utils/dateUtils';

interface UseRecordsReturn {
  records: BodyRecord[];
  filteredRecords: BodyRecord[];
  range: ChartRange;
  setRange: (range: ChartRange) => void;
  addRecord: (record: Omit<BodyRecord, 'id' | 'created_at'>) => Promise<number>;
  updateRecord: (
    id: number,
    record: Partial<Omit<BodyRecord, 'id' | 'created_at'>>,
  ) => Promise<boolean>;
  deleteRecord: (id: number) => Promise<boolean>;
  refreshRecords: () => void;
  totalCount: number;
  latestRecord: BodyRecord | null;
  previousRecord: BodyRecord | null;
  isLoading: boolean;
}

/**
 * records management hook
 * @returns records status and operation methods
 */
export function useRecords(): UseRecordsReturn {
  const [records, setRecords] = useState<BodyRecord[]>([]);
  const [range, setRange] = useState<ChartRange>('30days');
  const [isLoading, setIsLoading] = useState(true);

  const loadRecords = useCallback(() => {
    setIsLoading(true);
    try {
      const allRecords = getAllRecords('date', 'ASC');
      setRecords(allRecords);
    } catch (error) {
      console.error('Failed to load records: ', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = records.filter((record) =>
    isDateInRange(record.date, range),
  );

  const addRecord = useCallback(
    async (record: Omit<BodyRecord, 'id' | 'created_at'>) => {
      try {
        const newId = addRecordService(record);
        loadRecords();
        return newId;
      } catch (error) {
        console.error('Failed to add record: ', error);
        throw error;
      }
    },
    [loadRecords],
  );

  const updateRecord = useCallback(
    async (
      id: number,
      record: Partial<Omit<BodyRecord, 'id' | 'created_at'>>,
    ) => {
      try {
        const success = updateRecordService(id, record);
        if (success) {
          loadRecords();
        }
        return success;
      } catch (error) {
        console.error('Failed to update record: ', error);
        throw error;
      }
    },
    [loadRecords],
  );

  const deleteRecord = useCallback(
    async (id: number) => {
      try {
        const success = deleteRecordService(id);
        if (success) {
          loadRecords();
        }
        return success;
      } catch (error) {
        console.error('Failed to delete record: ', error);
        throw error;
      }
    },
    [loadRecords],
  );

  const totalCount = records.length;
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const previousRecord =
    records.length > 1 ? records[records.length - 2] : null;

  return {
    records,
    filteredRecords,
    range,
    setRange,
    addRecord,
    updateRecord,
    deleteRecord,
    refreshRecords: loadRecords,
    totalCount,
    latestRecord,
    previousRecord,
    isLoading,
  };
}
