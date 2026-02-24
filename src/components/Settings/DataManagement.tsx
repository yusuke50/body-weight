import { useState, useRef } from 'react';
import {
  exportToJSON,
  downloadJSON,
  importFromJSON,
  readJSONFile,
  copyToClipboard,
  pasteFromClipboard,
  exportToCSV,
  downloadCSV,
} from '../../services/exportService';
import type { ImportResult } from '../../types';

interface DataManagementProps {
  onDataImported: () => void;
}

export function DataManagement({ onDataImported }: DataManagementProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // 导出为 JSON 文件
  const handleExportJSON = () => {
    try {
      const data = exportToJSON();
      downloadJSON(data);
      showMessage('success', '數據已成功導出');
    } catch (error) {
      showMessage('error', '導出失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 导出为 CSV 文件
  const handleExportCSV = () => {
    try {
      const data = exportToCSV();
      downloadCSV(data);
      showMessage('success', 'CSV 文件已成功導出');
    } catch (error) {
      showMessage('error', 'CSV導出失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 复制到剪贴板
  const handleCopyToClipboard = async () => {
    try {
      const data = exportToJSON();
      const success = await copyToClipboard(data);
      if (success) {
        showMessage('success', '數據已複製到剪貼板');
      } else {
        showMessage('error', '複製到剪貼板失敗');
      }
    } catch (error) {
      showMessage('error', '複製失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  };

  // 从文件导入
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const jsonString = await readJSONFile(file);
      const result = await importFromJSON(jsonString, 'skip');
      setImportResult(result);
      onDataImported();
      showMessage('success', `成功導入 ${result.imported} 筆記錄`);
    } catch (error) {
      showMessage('error', '導入失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 从剪贴板导入
  const handlePasteImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const jsonString = await pasteFromClipboard();
      const result = await importFromJSON(jsonString, 'skip');
      setImportResult(result);
      onDataImported();
      showMessage('success', `成功導入 ${result.imported} 筆記錄`);
    } catch (error) {
      showMessage('error', '從剪貼板導入失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 导出部分 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">導出數據</h3>
        <p className="text-sm text-gray-600 mb-4">
          將您的數據導出為文件或複製到剪貼板，以便在其他設備上使用。
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📦 導出為 JSON 文件
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📊 導出為 CSV 文件
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            📋 複製到剪貼板
          </button>
        </div>
      </div>

      {/* 导入部分 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">導入數據</h3>
        <p className="text-sm text-gray-600 mb-4">
          從其他設備導入數據。重複的記錄將被自動跳過。
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
            disabled={isImporting}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            📂 從文件導入
          </button>
          <button
            onClick={handlePasteImport}
            disabled={isImporting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            📋 從剪貼板導入
          </button>
        </div>

        {/* 导入结果 */}
        {importResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">導入結果：</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ 成功導入：{importResult.imported} 筆</li>
              <li>⏭️ 跳過重複：{importResult.skipped} 筆</li>
              {importResult.errors > 0 && <li>❌ 錯誤：{importResult.errors} 筆</li>}
            </ul>
            {importResult.errorMessages && importResult.errorMessages.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-red-600">查看錯誤詳情</summary>
                <ul className="mt-2 text-xs text-red-600 space-y-1">
                  {importResult.errorMessages.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* 跨设备同步说明 */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 跨設備同步方法</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>方法1：使用雲端硬碟</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>在設備A導出JSON文件</li>
            <li>上傳到 Google Drive 或 Dropbox</li>
            <li>在設備B下載文件並導入</li>
          </ol>

          <p className="mt-3"><strong>方法2：使用即時通訊</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>在設備A點擊「複製到剪貼板」</li>
            <li>通過 LINE、Telegram 等發送給自己</li>
            <li>在設備B複製內容並點擊「從剪貼板導入」</li>
          </ol>

          <p className="mt-3 text-xs text-blue-600">
            ⚠️ 提示：定期導出數據作為備份，避免瀏覽器數據清除導致資料丟失。
          </p>
        </div>
      </div>
    </div>
  );
}
