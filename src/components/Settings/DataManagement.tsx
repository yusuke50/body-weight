import { useState, useRef } from 'react';
import {
  exportToJSON,
  downloadJSON,
  importFromJSON,
  readJSONFile,
  copyToClipboard,
  pasteFromClipboard,
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

  const handleExportJSON = () => {
    try {
      const data = exportToJSON();
      downloadJSON(data);
      showMessage('success', 'export successful');
    } catch (error) {
      showMessage('error', 'export failed: ' + (error instanceof Error ? error.message : 'unknown error'));
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const data = exportToJSON();
      const success = await copyToClipboard(data);
      if (success) {
        showMessage('success', 'data copied to clipboard');
      } else {
        showMessage('error', 'failed to copy to clipboard');
      }
    } catch (error) {
      showMessage('error', 'copy failed: ' + (error instanceof Error ? error.message : 'unknown error'));
    }
  };

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
      showMessage('success', `Successfully imported ${result.imported} records`);
    } catch (error) {
      showMessage('error', 'Import failed: ' + (error instanceof Error ? error.message : 'unknown error'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasteImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const jsonString = await pasteFromClipboard();
      const result = await importFromJSON(jsonString, 'skip');
      setImportResult(result);
      onDataImported();
      showMessage('success', `Successfully imported ${result.imported} records`);
    } catch (error) {
      showMessage('error', 'Failed to import from clipboard: ' + (error instanceof Error ? error.message : 'unknown error'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">匯出記錄</h3>
        <p className="text-sm text-gray-600 mb-4">
          將資料匯出為 JSON 格式，方便在其他裝置上備份或同步。建議定期匯出以防止資料遺失。
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📦 匯出為 JSON 檔案
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            📋 複製到剪貼簿
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">匯入記錄</h3>
        <p className="text-sm text-gray-600 mb-4">
          從其他裝置匯入資料。重複的記錄將會自動跳過。
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
            📂 從 JSON 文件匯入
          </button>
          <button
            onClick={handlePasteImport}
            disabled={isImporting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            📋 從剪貼簿匯入
          </button>
        </div>

        {importResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">匯入結果</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ 成功匯入  {importResult.imported} 筆記錄</li>
              <li>⏭️ 跳過的重複記錄  {importResult.skipped} 筆</li>
              {importResult.errors > 0 && <li>❌ 錯誤 {importResult.errors} 筆</li>}
            </ul>
            {importResult.errorMessages && importResult.errorMessages.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-red-600">檢視錯誤詳情</summary>
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

      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 跨裝置同步方法</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>方法 1: 使用雲端儲存</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>從裝置 A 匯出 JSON 檔案</li>
            <li>上傳到 Google Drive 或 Dropbox</li>
            <li>在裝置 B 下載檔案並匯入</li>
          </ol>

          <p className="mt-3"><strong>方法 2: 使用即時通訊</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>在裝置 A 上點擊 "複製到剪貼簿"</li>
            <li>透過 LINE、Telegram 等應用程式發送給自己</li>
            <li>在裝置 B 上複製內容並點擊 "從剪貼簿匯入"</li>
          </ol>

          <p className="mt-3 text-xs text-blue-600">
            ⚠️ 提醒：匯出檔案包含您的所有記錄，請妥善保管。記得定期備份以防止資料遺失！
          </p>
        </div>
      </div>
    </div>
  );
}
