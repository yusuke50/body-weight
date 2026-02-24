import { useState } from 'react';
import type { BodyRecord, RecordFormData } from '../../types';
import { validateRecordForm, safeParseFloat } from '../../utils/validators';
import { getTodayDate, getCurrentDateTime } from '../../utils/dateUtils';

interface EntryFormProps {
  onSubmit: (record: Omit<BodyRecord, 'id' | 'created_at'>) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<RecordFormData>;
}

export function EntryForm({ onSubmit, onCancel, initialData }: EntryFormProps) {
  const [formData, setFormData] = useState<RecordFormData>({
    date: initialData?.date || getTodayDate(),
    weight: initialData?.weight || '',
    body_fat_percentage: initialData?.body_fat_percentage || '',
    water_percentage: initialData?.water_percentage || '',
    muscle_mass: initialData?.muscle_mass || '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof RecordFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    const validation = validateRecordForm(formData);
    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((err) => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    setIsSubmitting(true);

    try {
      // 转换表单数据为记录对象
      const record: Omit<BodyRecord, 'id' | 'created_at'> = {
        date: formData.date,
        weight: parseFloat(formData.weight),
        body_fat_percentage: safeParseFloat(formData.body_fat_percentage),
        water_percentage: safeParseFloat(formData.water_percentage),
        muscle_mass: safeParseFloat(formData.muscle_mass),
        notes: formData.notes || undefined,
      };

      await onSubmit(record);

      // 重置表单
      setFormData({
        date: getTodayDate(),
        weight: '',
        body_fat_percentage: '',
        water_percentage: '',
        muscle_mass: '',
        notes: '',
      });
      setErrors({});
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 日期 */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            測量日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            max={getTodayDate()}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        {/* 体重 */}
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
            體重 (kg) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="weight"
            step="0.1"
            value={formData.weight}
            onChange={(e) => handleChange('weight', e.target.value)}
            placeholder="例如：70.5"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.weight ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
        </div>

        {/* 体脂率 */}
        <div>
          <label htmlFor="body_fat_percentage" className="block text-sm font-medium text-gray-700 mb-1">
            體脂率 (%)
          </label>
          <input
            type="number"
            id="body_fat_percentage"
            step="0.1"
            value={formData.body_fat_percentage}
            onChange={(e) => handleChange('body_fat_percentage', e.target.value)}
            placeholder="例如：25.5"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.body_fat_percentage ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.body_fat_percentage && (
            <p className="text-red-500 text-sm mt-1">{errors.body_fat_percentage}</p>
          )}
        </div>

        {/* 含水量 */}
        <div>
          <label htmlFor="water_percentage" className="block text-sm font-medium text-gray-700 mb-1">
            身體含水量 (%)
          </label>
          <input
            type="number"
            id="water_percentage"
            step="0.1"
            value={formData.water_percentage}
            onChange={(e) => handleChange('water_percentage', e.target.value)}
            placeholder="例如：55.0"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.water_percentage ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.water_percentage && (
            <p className="text-red-500 text-sm mt-1">{errors.water_percentage}</p>
          )}
        </div>

        {/* 肌肉量 */}
        <div className="md:col-span-2">
          <label htmlFor="muscle_mass" className="block text-sm font-medium text-gray-700 mb-1">
            肌肉量 (kg)
          </label>
          <input
            type="number"
            id="muscle_mass"
            step="0.1"
            value={formData.muscle_mass}
            onChange={(e) => handleChange('muscle_mass', e.target.value)}
            placeholder="例如：50.0"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.muscle_mass ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.muscle_mass && <p className="text-red-500 text-sm mt-1">{errors.muscle_mass}</p>}
        </div>

        {/* 备注 */}
        <div className="md:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            備註
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="記錄任何相關信息..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? '提交中...' : '提交'}
        </button>
      </div>
    </form>
  );
}
