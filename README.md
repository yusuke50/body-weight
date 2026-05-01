# Body Weight Tracker

A web-based body weight tracking application that helps you record and visualize changes in your body metrics.

## Features

### 📊 Data Tracking

- Record total weight, body fat percentage, body water percentage, and muscle mass
- Automatically calculate derived metrics such as body fat weight
- Support for adding notes

### 📈 Data Visualization

- Body fat weight trend chart
- Time range filtering (7 days, 30 days, 90 days, all)
- Interactive charts with hover details

### 💾 Data Management

- **Cross-Device Sync**: Sync data across multiple devices via export/import
- Export formats: JSON
- Multiple sharing methods:
  - Download file (shareable via cloud storage)
  - Copy to clipboard (transferable via messaging apps)
- Smart merge: Automatically skip duplicate records during import

### 🎨 User Experience

- Responsive design supporting desktop, tablet, and mobile
- Uses Noto Sans Traditional Chinese font for optimal Chinese display
- Local data storage for privacy and security

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Charts**: Chart.js
- **Database**: localStorage (browser-based)
- **Styling**: TailwindCSS
- **Fonts**: Noto Sans Traditional Chinese + Open Sans

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:5173`.

### Production Build

```bash
npm run build
```

Build files will be generated in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage Guide

### Adding Records

1. Click the "Add Record" button on the dashboard
2. Fill in measurement data (weight is required)
3. Click "Submit" to save

### Viewing Charts

1. Click the "Charts" tab in the navigation bar
2. Select a time range (7 days, 30 days, 90 days, all)
3. Hover over data points to view detailed information

### Cross-Device Data Sync

#### Method 1: Using Cloud Storage

1. On Device A, click "Settings" → "Export as JSON File"
2. Upload the file to Google Drive or Dropbox
3. On Device B, download the file and click "Import from File"

#### Method 2: Using Messaging Apps

1. On Device A, click "Settings" → "Copy to Clipboard"
2. Send to yourself via LINE, Telegram, etc.
3. On Device B, copy the content and click "Import from Clipboard"

## Data Storage

- All data is stored in the browser's localStorage
- Data is not uploaded to any server; runs entirely locally
- ⚠️ **Important**: Clearing browser data will result in loss of all records. Please export backups regularly!

## Project Structure

```
body-weight-auto/
├── src/
│   ├── components/        # React components
│   │   ├── Charts/       # Chart components
│   │   ├── Dashboard/    # Dashboard
│   │   ├── DataEntry/    # Data entry
│   │   ├── Layout/       # Layout components
│   │   └── Settings/     # Settings components
│   ├── hooks/            # Custom Hooks
│   ├── services/         # Service layer (database, export, etc.)
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── App.tsx           # Main application component
├── public/
└── package.json
```

## Future Plans

- [ ] More chart types (total weight, muscle mass, water percentage trends)
- [ ] Data editing and deletion functionality
- [ ] User settings (height, target weight, etc.)
- [ ] QR code sharing
- [ ] Dark theme
- [ ] Data statistics and analysis

## Browser Compatibility

- Chrome (Recommended)
- Firefox
- Edge
- Safari

## License

MIT License

## Acknowledgments

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Chart.js](https://www.chartjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
