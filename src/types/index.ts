// ========== 数据库记录类型 ==========

export interface BodyRecord {
  id?: number;
  date: string; // ISO 8601 格式
  weight: number; // kg
  body_fat_percentage?: number; // %
  water_percentage?: number; // %
  muscle_mass?: number; // kg
  notes?: string;
  created_at?: string;
}

// ========== 派生指标类型 ==========

export interface DerivedMetrics {
  bodyFatWeight: number; // 体脂肪重量 (kg)
  leanMass: number; // 瘦体重 (kg)
  bmi?: number; // BMI
}

export interface RecordWithMetrics extends BodyRecord {
  metrics: DerivedMetrics;
}

// ========== 用户设置类型 ==========

export interface UserSettings {
  height?: number; // cm
  target_weight?: number; // kg
  target_body_fat?: number; // %
  theme?: 'light' | 'dark';
  default_chart_range?: ChartRange;
}

export type ChartRange = '7days' | '30days' | '90days' | 'all';

// ========== 图表数据类型 ==========

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

// ========== 数据导出/导入类型 ==========

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

// ========== 统计数据类型 ==========

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

// ========== UI 组件属性类型 ==========

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

// ========== 数据验证类型 ==========

export interface ValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
}
