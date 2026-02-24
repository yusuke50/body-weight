import type { ExportData, ImportResult, BodyRecord } from '../types';
import { getAllRecords, getAllSettings, addRecord, checkRecordExists } from './dataService';
import { saveDatabase } from './database';

/**
 * 导出所有数据为JSON格式
 * @returns JSON字符串
 */
export function exportToJSON(): string {
  const records = getAllRecords('date', 'ASC');
  const settings = getAllSettings();

  const data: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    records,
    settings,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * 下载JSON文件
 * @param data JSON数据字符串
 * @param filename 文件名
 */
export function downloadJSON(data: string, filename?: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `body-weight-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 从JSON导入数据
 * @param jsonString JSON数据字符串
 * @param mergeStrategy 合并策略: 'skip'=跳过重复, 'overwrite'=覆盖重复
 * @returns 导入结果
 */
export async function importFromJSON(
  jsonString: string,
  mergeStrategy: 'skip' | 'overwrite' = 'skip'
): Promise<ImportResult> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  try {
    const data: ExportData = JSON.parse(jsonString);

    // 验证数据格式
    if (!data.version || !data.records || !Array.isArray(data.records)) {
      throw new Error('无效的数据格式');
    }

    // 导入记录
    for (const record of data.records) {
      try {
        // 验证必填字段
        if (!record.date || !record.weight) {
          errors++;
          errorMessages.push(`记录缺少必填字段: ${JSON.stringify(record)}`);
          continue;
        }

        // 检查是否已存在
        const exists = checkRecordExists(record.date, record.weight);

        if (exists) {
          if (mergeStrategy === 'skip') {
            skipped++;
            continue;
          }
          // 如果是 'overwrite' 策略，这里可以实现更新逻辑
          // 暂时跳过
          skipped++;
          continue;
        }

        // 添加新记录
        const recordToAdd: Omit<BodyRecord, 'id' | 'created_at'> = {
          date: record.date,
          weight: record.weight,
          body_fat_percentage: record.body_fat_percentage,
          water_percentage: record.water_percentage,
          muscle_mass: record.muscle_mass,
          notes: record.notes,
        };

        addRecord(recordToAdd);
        imported++;
      } catch (error) {
        errors++;
        errorMessages.push(`导入记录失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 导入设置（可选）
    if (data.settings) {
      // 这里可以选择是否导入设置
      // saveUserSettings(data.settings);
    }

    saveDatabase();

    return {
      imported,
      skipped,
      errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    };
  } catch (error) {
    throw new Error(`导入失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 从文件读取JSON数据
 * @param file 文件对象
 * @returns Promise<JSON字符串>
 */
export function readJSONFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('文件读取失败'));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取错误'));
    };

    reader.readAsText(file);
  });
}

/**
 * 复制到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean>
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    // 降级方案
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 从剪贴板粘贴
 * @returns Promise<string>
 */
export async function pasteFromClipboard(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (error) {
    console.error('从剪贴板读取失败:', error);
    throw new Error('无法访问剪贴板，请确保已授予权限');
  }
}

/**
 * 导出为CSV格式
 * @returns CSV字符串
 */
export function exportToCSV(): string {
  const records = getAllRecords('date', 'ASC');

  // CSV 表头
  const headers = [
    '日期',
    '体重(kg)',
    '体脂率(%)',
    '含水量(%)',
    '肌肉量(kg)',
    '备注',
  ];

  // CSV 行
  const rows = records.map((record) => [
    record.date,
    record.weight.toString(),
    record.body_fat_percentage?.toString() || '',
    record.water_percentage?.toString() || '',
    record.muscle_mass?.toString() || '',
    record.notes || '',
  ]);

  // 组合成CSV
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * 下载CSV文件
 * @param data CSV数据字符串
 * @param filename 文件名
 */
export function downloadCSV(data: string, filename?: string): void {
  // 添加 BOM 以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `body-weight-data-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
