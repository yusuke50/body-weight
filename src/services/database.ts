// use localStorage save data, for better compatibility and simplicity
const DB_STORAGE_KEY = 'bodyweight_db_v2';
const SETTINGS_STORAGE_KEY = 'bodyweight_settings';

let isInitialized = false;

/**
 * initialize the database (localStorage in this case)
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    const existingData = localStorage.getItem(DB_STORAGE_KEY);
    if (!existingData) {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify([]));
    }

    const existingSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!existingSettings) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({}));
    }

    isInitialized = true;
    console.log('initDatabase: Database initialized successfully');
  } catch (error) {
    console.error('initDatabase: Failed to initialize database:', error);
    throw error;
  }
}

/**
 * get all records from storage
 * @returns array of records
 */
export function getAllRecordsFromStorage(): any[] {
  try {
    const data = localStorage.getItem(DB_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('getAllRecordsFromStorage: Failed to read records:', error);
    return [];
  }
}

/**
 * save all records to storage
 * @param records array of records to save
 */
export function saveAllRecordsToStorage(records: any[]): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('saveAllRecordsToStorage: Failed to save records:', error);
    throw error;
  }
}

/**
 * get all settings from storage
 * @returns array of settings
 */
export function getAllSettingsFromStorage(): any {
  try {
    const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('getAllSettingsFromStorage: Failed to read settings:', error);
    return {};
  }
}

/**
 * save all settings to storage
 * @param settings array of settings to save
 */
export function saveAllSettingsToStorage(settings: any): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('saveAllSettingsToStorage: Failed to save settings:', error);
    throw error;
  }
}

/**
 * clear all data from storage (for testing or reset purposes)
 */
export function clearAllData(): void {
  localStorage.removeItem(DB_STORAGE_KEY);
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({}));
  console.log('clearAllData: All data has been cleared');
}

/**
 * export database as JSON string
 */
export function exportDatabaseBinary(): string {
  const records = getAllRecordsFromStorage();
  const settings = getAllSettingsFromStorage();
  return JSON.stringify({ records, settings });
}

/**
 * import database from JSON string
 * @param jsonString JSON string containing records and settings
 * @throws error if JSON parsing fails or data is invalid
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
    console.log('initDatabase: Database imported successfully');
  } catch (error) {
    console.error('initDatabase: Failed to import database:', error);
    throw error;
  }
}
