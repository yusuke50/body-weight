# Body Weight Tracker / 體重追蹤工具

React + TypeScript + Vite 製作的體重追蹤網頁，支援：

- 必填：總體重、體脂肪率
- 選填：筋肉量重、身體含水量
- 自動計算：體脂肪重、淨體重
- 顯示方式：表格 + 圖表
- 語言：繁體中文 / English
- 響應式：手機 / 平板 / 筆電
- 跨裝置資料同步（Firebase Firestore + 同步代碼）

## Quick Start

```bash
npm install
npm run dev
```

## Cross-device Sync Setup (Firebase)

1. 在 Firebase 建立專案並啟用 Firestore Database。
2. 建立 `.env`（可從 `.env.example` 複製）並填入：

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

3. 啟動後，在各裝置輸入相同「同步代碼」，即可看到同一份紀錄。

## Firestore Rules (for personal use demo)

開發初期可先用以下規則快速驗證（正式上線請改為更嚴格規則）：

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{syncKey}/entries/{entryId} {
      allow read, write: if true;
    }
  }
}
```

## Build

```bash
npm run build
```
