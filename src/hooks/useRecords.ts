import { useState, useEffect, useCallback } from 'react';
import type { BodyRecord, ChartRange } from '../types';
import {
  getAllRecords,
  addRecord as addRecordService,
  updateRecord as updateRecordService,
  deleteRecord as deleteRecordService,
  getRecordCount,
  getLatestRecord,
  getFirstRecord,
} from '../services/dataService';
import { isDateInRange } from '../utils/dateUtils';

interface UseRecordsReturn {
  records: BodyRecord[];
  filteredRecords: BodyRecord[];
  range: ChartRange;
  setRange: (range: ChartRange) => void;
  addRecord: (record: Omit<BodyRecord, 'id' | 'created_at'>) => Promise<number>;
  updateRecord: (id: number, record: Partial<Omit<BodyRecord, 'id' | 'created_at'>>) => Promise<boolean>;
  deleteRecord: (id: number) => Promise<boolean>;
  refreshRecords: () => void;
  totalCount: number;
  latestRecord: BodyRecord | null;
  firstRecord: BodyRecord | null;
  isLoading: boolean;
}

/**
 * 记录管理 Hook
 * @returns 记录状态和操作方法
 */
export function useRecords(): UseRecordsReturn {
  const [records, setRecords] = useState<BodyRecord[]>([]);
  const [range, setRange] = useState<ChartRange>('30days');
  const [isLoading, setIsLoading] = useState(true);

  // 加载所有记录
  const loadRecords = useCallback(() => {
    setIsLoading(true);
    try {
      const allRecords = getAllRecords('date', 'ASC');
      setRecords(allRecords);
    } catch (error) {
      console.error('加载记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // 根据范围过滤记录
  const filteredRecords = records.filter((record) => isDateInRange(record.date, range));

  // 添加记录
  const addRecord = useCallback(
    async (record: Omit<BodyRecord, 'id' | 'created_at'>) => {
      try {
        const newId = addRecordService(record);
        loadRecords(); // 重新加载记录
        return newId;
      } catch (error) {
        console.error('添加记录失败:', error);
        throw error;
      }
    },
    [loadRecords]
  );

  // 更新记录
  const updateRecord = useCallback(
    async (id: number, record: Partial<Omit<BodyRecord, 'id' | 'created_at'>>) => {
      try {
        const success = updateRecordService(id, record);
        if (success) {
          loadRecords(); // 重新加载记录
        }
        return success;
      } catch (error) {
        console.error('更新记录失败:', error);
        throw error;
      }
    },
    [loadRecords]
  );

  // 删除记录
  const deleteRecord = useCallback(
    async (id: number) => {
      try {
        const success = deleteRecordService(id);
        if (success) {
          loadRecords(); // 重新加载记录
        }
        return success;
      } catch (error) {
        console.error('删除记录失败:', error);
        throw error;
      }
    },
    [loadRecords]
  );

  // 从记录数组中派生统计信息（避免在数据库未初始化时调用）
  const totalCount = records.length;
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const firstRecord = records.length > 0 ? records[0] : null;

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
    firstRecord,
    isLoading,
  };
}
