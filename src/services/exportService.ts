import type { ExportData, ImportResult, BodyRecord } from '../types';
import {
  getAllRecords,
  getAllSettings,
  addRecord,
  checkRecordExists,
} from './dataService';

/**
 * export data to JSON string
 * @returns JSON string containing all records and settings
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
 * download JSON data as a file
 * @param data JSON string to download
 * @param filename filename for the downloaded file (optional)
 */
export function downloadJSON(data: string, filename?: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download =
    filename ||
    `body-weight-data-${new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * import data from JSON string with optional merge strategy
 * @param jsonString JSON string containing records and settings to import
 * @param mergeStrategy strategy for handling duplicate records ('skip' or 'overwrite', default: 'skip')
 * @returns Promise<ImportResult> import result
 */
export async function importFromJSON(
  jsonString: string,
  mergeStrategy: 'skip' | 'overwrite' = 'skip',
): Promise<ImportResult> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  try {
    const data: ExportData = JSON.parse(jsonString);

    if (!data.version || !data.records || !Array.isArray(data.records)) {
      throw new Error('invalid data format');
    }

    for (const record of data.records) {
      try {
        if (!record.date || !record.weight) {
          errors++;
          errorMessages.push(
            `record is missing required fields: ${JSON.stringify(record)}`,
          );
          continue;
        }

        const exists = checkRecordExists(record.date, record.weight);

        if (exists) {
          if (mergeStrategy === 'skip') {
            skipped++;
            continue;
          }

          skipped++;
          continue;
        }

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
        errorMessages.push(
          `import record failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      imported,
      skipped,
      errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    };
  } catch (error) {
    throw new Error(
      `import failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * import JSON file and return its content as a string
 * @param file file to read
 * @returns Promise<string> JSON string read from the file
 */
export function readJSONFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('readJSONFile: File content is not a string'));
      }
    };

    reader.onerror = () => {
      reject(new Error('readJSONFile: Error reading file'));
    };

    reader.readAsText(file);
  });
}

/**
 * copy text to clipboard with fallback for older browsers
 * @param text text to copy
 * @returns Promise<boolean>
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('copyToClipboard: Failed to copy to clipboard:', error);
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
 * paste text from clipboard with fallback for older browsers
 * @returns Promise<string>
 */
export async function pasteFromClipboard(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (error) {
    console.error('pasteFromClipboard: Failed to paste from clipboard:', error);
    throw new Error('pasteFromClipboard: cannot paste from clipboard');
  }
}
