import { useState } from 'react';
import type { BodyRecord } from '../../types';
import { EntryForm } from '../DataEntry/EntryForm';
import { StatCard } from './StatCard';
import { calculateBodyFatWeight, formatNumber } from '../../utils/calculations';
import { formatDateTime } from '../../utils/dateUtils';

interface DashboardProps {
  latestRecord: BodyRecord | null;
  firstRecord: BodyRecord | null;
  totalCount: number;
  onAddRecord: (record: Omit<BodyRecord, 'id' | 'created_at'>) => Promise<number>;
}

export function Dashboard({ latestRecord, firstRecord, totalCount, onAddRecord }: DashboardProps) {
  const [isAddingRecord, setIsAddingRecord] = useState(false);

  const weightChange =
    latestRecord && firstRecord
      ? latestRecord.weight - firstRecord.weight
      : 0;

  const bodyFatChange =
    latestRecord && firstRecord && latestRecord.body_fat_percentage && firstRecord.body_fat_percentage
      ? calculateBodyFatWeight(latestRecord.weight, latestRecord.body_fat_percentage) -
        calculateBodyFatWeight(firstRecord.weight, firstRecord.body_fat_percentage)
      : 0;

  const handleAddRecord = async (record: Omit<BodyRecord, 'id' | 'created_at'>) => {
    await onAddRecord(record);
    setIsAddingRecord(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="總記錄數"
          value={totalCount.toString()}
          icon="📊"
        />
        <StatCard
          title="目前體重"
          value={latestRecord ? `${latestRecord.weight} kg` : '-'}
          subtitle={weightChange !== 0 ? `${weightChange > 0 ? '+' : ''}${formatNumber(weightChange, 1)} kg` : undefined}
          icon="⚖️"
        />
        <StatCard
          title="目前體脂率"
          value={latestRecord?.body_fat_percentage ? `${latestRecord.body_fat_percentage}%` : '-'}
          icon="📉"
        />
        <StatCard
          title="體脂肪重量"
          value={
            latestRecord && latestRecord.body_fat_percentage
              ? `${formatNumber(calculateBodyFatWeight(latestRecord.weight, latestRecord.body_fat_percentage))} kg`
              : '-'
          }
          subtitle={bodyFatChange !== 0 ? `${bodyFatChange > 0 ? '+' : ''}${formatNumber(bodyFatChange, 1)} kg` : undefined}
          icon="🔥"
        />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">最新記錄</h2>
        <button
          onClick={() => setIsAddingRecord(!isAddingRecord)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isAddingRecord ? '取消' : '➕ 新增記錄'}
        </button>
      </div>

      {isAddingRecord && (
        <div className="bg-white p-6 rounded-lg shadow">
          <EntryForm onSubmit={handleAddRecord} onCancel={() => setIsAddingRecord(false)} />
        </div>
      )}

      {!isAddingRecord && latestRecord && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最新一筆記錄</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-4">
              <p className="text-sm text-gray-500">日期</p>
              <p className="text-lg font-semibold">{formatDateTime(latestRecord.date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">體重</p>
              <p className="text-lg font-semibold">{latestRecord.weight} kg</p>
            </div>
            {latestRecord.body_fat_percentage && (
              <div>
                <p className="text-sm text-gray-500">體脂率</p>
                <p className="text-lg font-semibold">{latestRecord.body_fat_percentage}%</p>
              </div>
            )}
            {latestRecord.muscle_mass && (
              <div>
                <p className="text-sm text-gray-500">筋肉量</p>
                <p className="text-lg font-semibold">{latestRecord.muscle_mass} kg</p>
              </div>
            )}
            {latestRecord.water_percentage && (
              <div>
                <p className="text-sm text-gray-500">身體含水量</p>
                <p className="text-lg font-semibold">{latestRecord.water_percentage}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!latestRecord && !isAddingRecord && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 text-lg mb-4">還沒有任何記錄</p>
          <button
            onClick={() => setIsAddingRecord(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            新增第一筆記錄
          </button>
        </div>
      )}
    </div>
  );
}
