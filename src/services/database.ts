// 使用 localStorage 直接存储数据（简化版本，无需 sql.js）

const DB_STORAGE_KEY = 'bodyweight_db_v2';
const SETTINGS_STORAGE_KEY = 'bodyweight_settings';

let isInitialized = false;

/**
 * 初始化数据库（localStorage 版本）
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    // 检查是否有现有数据
    const existingData = localStorage.getItem(DB_STORAGE_KEY);
    if (!existingData) {
      // 初始化空数据
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify([]));
    }

    const existingSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!existingSettings) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({}));
    }

    isInitialized = true;
    console.log('数据库（localStorage）已初始化');
  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  }
}

/**
 * 获取所有记录
 */
export function getAllRecordsFromStorage(): any[] {
  try {
    const data = localStorage.getItem(DB_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('读取记录失败:', error);
    return [];
  }
}

/**
 * 保存所有记录
 */
export function saveAllRecordsToStorage(records: any[]): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(records));
    console.log('数据已保存');
  } catch (error) {
    console.error('保存记录失败:', error);
    throw error;
  }
}

/**
 * 获取所有设置
 */
export function getAllSettingsFromStorage(): any {
  try {
    const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('读取设置失败:', error);
    return {};
  }
}

/**
 * 保存所有设置
 */
export function saveAllSettingsToStorage(settings: any): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存设置失败:', error);
    throw error;
  }
}

/**
 * 清空所有数据
 */
export function clearAllData(): void {
  localStorage.removeItem(DB_STORAGE_KEY);
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({}));
  console.log('所有数据已清空');
}

/**
 * 导出数据库为 JSON
 */
export function exportDatabaseBinary(): string {
  const records = getAllRecordsFromStorage();
  const settings = getAllSettingsFromStorage();
  return JSON.stringify({ records, settings });
}

/**
 * 从 JSON 导入数据库
 */
export async function importDatabaseBinary(jsonString: string): Promise<void> {
  try {
    const data = JSON.parse(jsonString);
    if (data.records) {
      saveAllRecordsToStorage(data.records);
    }
    if (data.settings) {
      saveAllSettingsToStorage(data.settings);
    }
    console.log('数据库导入成功');
  } catch (error) {
    console.error('导入数据库失败:', error);
    throw error;
  }
}

// 兼容性函数（保持原有接口）
export function getDatabase(): any {
  return { initialized: isInitialized };
}

export function saveDatabase(): void {
  // localStorage 自动保存，无需额外操作
}

export function closeDatabase(): void {
  isInitialized = false;
}
