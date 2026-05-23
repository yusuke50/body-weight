import { useEffect, useState } from 'react';
import { useProfile } from '../../hooks/useProfile';

export function ProfileSettings() {
  const { height, updateHeight, isLoading } = useProfile();
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setInputValue(height !== null ? height.toString() : '');
  }, [height]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (trimmed === '') {
      updateHeight(null);
      showMessage('success', '已清除身高');
      return;
    }

    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 300) {
      showMessage('error', '請輸入有效的身高（1 - 300 cm）');
      return;
    }

    updateHeight(parsed);
    showMessage('success', '身高已儲存');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">個人資料</h3>
      <p className="text-sm text-gray-600 mb-4">
        設定身高，未來可用於計算 BMI 等指標。
      </p>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="height-input" className="block text-sm font-medium text-gray-700 mb-1">
            身高 (cm)
          </label>
          <input
            id="height-input"
            type="number"
            step="0.1"
            min="0"
            max="300"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder="例如 170.5"
            className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          💾 儲存
        </button>
      </div>
    </div>
  );
}
