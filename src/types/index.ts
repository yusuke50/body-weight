export interface BodyRecord {
  id?: number;
  date: string; // ISO 8601 format
  weight: number; // kg
  body_fat_percentage?: number; // %
  water_percentage?: number; // %
  muscle_mass?: number; // kg
  notes?: string;
  created_at?: string;
}

export interface DerivedMetrics {
  bodyFatWeight: number; // fat weight (kg)
  leanMass: number; // lean mass (kg)
}

export interface RecordWithMetrics extends BodyRecord {
  metrics: DerivedMetrics;
}

export interface UserSettings {
  height?: number; // cm
  target_weight?: number; // kg
  target_body_fat?: number; // %
  theme?: 'light' | 'dark';
  default_chart_range?: ChartRange;
}

export type ChartRange = '7days' | '30days' | '90days' | 'all';

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface MultiSeriesChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}

export interface ExportData {
  version: string;
  exportDate: string;
  records: BodyRecord[];
  settings: UserSettings;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  errorMessages?: string[];
}

export interface Statistics {
  totalRecords: number;
  firstRecord?: BodyRecord;
  latestRecord?: BodyRecord;
  weightChange?: number;
  bodyFatChange?: number;
  avgLast7Days?: {
    weight: number;
    bodyFat?: number;
    muscleMass?: number;
  };
  avgLast30Days?: {
    weight: number;
    bodyFat?: number;
    muscleMass?: number;
  };
}

export interface ChartProps {
  data: BodyRecord[];
  range: ChartRange;
  onRangeChange?: (range: ChartRange) => void;
}

export interface RecordFormData {
  date: string;
  weight: string;
  body_fat_percentage: string;
  water_percentage: string;
  muscle_mass: string;
  notes: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
}
