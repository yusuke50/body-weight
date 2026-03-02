import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  'zh-TW': {
    translation: {
      appTitle: '體重變化追蹤',
      appSubtitle: '記錄每日數據，並自動計算體脂肪重與淨體重',
      language: '語言',
      date: '日期',
      totalWeight: '總體重 (kg)',
      bodyFatPct: '體脂肪率 (%)',
      muscleMass: '筋肉量重 (kg，可選)',
      bodyWaterPct: '身體含水量 (%)，可選',
      fatMass: '體脂肪重 (kg)',
      leanMass: '淨體重 (kg)',
      addRecord: '新增記錄',
      syncKey: '同步代碼',
      syncHint: '在不同裝置輸入相同同步代碼即可共用資料。',
      cloudMode: '雲端同步模式',
      localMode: '本機模式',
      firebaseMissing: '尚未設定 Firebase，資料目前只儲存在本機。',
      chartTitle: '體重與身體組成趨勢',
      tableTitle: '歷史紀錄',
      noData: '尚無資料，請先新增第一筆紀錄。',
      actions: '操作',
      delete: '刪除',
      requiredError: '請填寫日期、總體重與體脂肪率。',
      numericError: '請確認數值皆為正數，且體脂肪率需介於 0 到 100。',
      saveError: '儲存失敗，請稍後再試。',
      deleteError: '刪除失敗，請稍後再試。',
    },
  },
  en: {
    translation: {
      appTitle: 'Body Weight Trend Tracker',
      appSubtitle: 'Record daily metrics and auto-calculate fat mass and lean mass',
      language: 'Language',
      date: 'Date',
      totalWeight: 'Total Weight (kg)',
      bodyFatPct: 'Body Fat (%)',
      muscleMass: 'Muscle Mass (kg, optional)',
      bodyWaterPct: 'Body Water (%), optional',
      fatMass: 'Fat Mass (kg)',
      leanMass: 'Lean Mass (kg)',
      addRecord: 'Add Record',
      syncKey: 'Sync Key',
      syncHint: 'Use the same sync key on all devices to share records.',
      cloudMode: 'Cloud Sync Mode',
      localMode: 'Local Mode',
      firebaseMissing: 'Firebase is not configured, so records are only stored locally.',
      chartTitle: 'Weight & Body Composition Trend',
      tableTitle: 'History',
      noData: 'No data yet. Add your first record.',
      actions: 'Actions',
      delete: 'Delete',
      requiredError: 'Please provide date, total weight, and body fat percentage.',
      numericError: 'All values must be positive and body fat must be between 0 and 100.',
      saveError: 'Failed to save. Please try again later.',
      deleteError: 'Failed to delete. Please try again later.',
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: navigator.language === 'zh-TW' ? 'zh-TW' : 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
