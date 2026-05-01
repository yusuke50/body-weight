import type { ChartOptions } from 'chart.js';
import type { BodyRecord, ChartDataPoint } from '../types';
import { calculateBodyFatWeight } from './calculations';
import { formatDate } from './dateUtils';

/**
 * chart colors for different metrics
 */
export const CHART_COLORS = {
  weight: '#3b82f6',
  bodyFat: '#ef4444',
  muscleMass: '#10b981',
  water: '#06b6d4',
  bodyFatPercentage: '#f59e0b',
};

/**
 * basic Chart.js options for line charts
 * @param title chart title
 * @param yAxisLabel Y-axis label
 * @returns Chart.js options object
 */
export function createLineChartOptions(
  title: string,
  yAxisLabel: string,
): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
          family: "'Noto Sans TC', 'Open Sans', sans-serif",
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        bodyFont: {
          family: "'Noto Sans TC', 'Open Sans', sans-serif",
        },
        titleFont: {
          family: "'Noto Sans TC', 'Open Sans', sans-serif",
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MM/dd',
          },
        },
        title: {
          display: true,
          text: '日期',
          font: {
            family: "'Noto Sans TC', 'Open Sans', sans-serif",
          },
        },
        ticks: {
          font: {
            family: "'Noto Sans TC', 'Open Sans', sans-serif",
          },
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: yAxisLabel,
          font: {
            family: "'Noto Sans TC', 'Open Sans', sans-serif",
          },
        },
        ticks: {
          font: {
            family: "'Noto Sans TC', 'Open Sans', sans-serif",
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };
}

/**
 * extract weight data points from records
 * @param records records array
 * @returns data points array
 */
export function extractWeightData(records: BodyRecord[]): ChartDataPoint[] {
  return records.map((record) => ({
    date: record.date,
    value: record.weight,
  }));
}

/**
 * extract body fat weight data points from records
 * @param records records array
 * @returns data points array
 */
export function extractBodyFatWeightData(
  records: BodyRecord[],
): ChartDataPoint[] {
  return records
    .filter((record) => record.body_fat_percentage !== undefined)
    .map((record) => ({
      date: record.date,
      value: calculateBodyFatWeight(record.weight, record.body_fat_percentage),
    }));
}

/**
 * extract body fat percentage data points from records
 * @param records records array
 * @returns data points array
 */
export function extractBodyFatPercentageData(
  records: BodyRecord[],
): ChartDataPoint[] {
  return records
    .filter((record) => record.body_fat_percentage !== undefined)
    .map((record) => ({
      date: record.date,
      value: record.body_fat_percentage!,
    }));
}

/**
 * extract muscle mass data points from records
 * @param records records array
 * @returns data points array
 */
export function extractMuscleMassData(records: BodyRecord[]): ChartDataPoint[] {
  return records
    .filter((record) => record.muscle_mass !== undefined)
    .map((record) => ({
      date: record.date,
      value: record.muscle_mass!,
    }));
}

/**
 * extract water percentage data points from records
 * @param records records array
 * @returns data points array
 */
export function extractWaterPercentageData(
  records: BodyRecord[],
): ChartDataPoint[] {
  return records
    .filter((record) => record.water_percentage !== undefined)
    .map((record) => ({
      date: record.date,
      value: record.water_percentage!,
    }));
}

/**
 * format data points array into Chart.js data format
 * @param dataPoints data points array
 * @returns Chart.js data object
 */
export function formatChartData(dataPoints: ChartDataPoint[]) {
  return {
    labels: dataPoints.map((dp) => dp.date),
    datasets: [
      {
        data: dataPoints.map((dp) => ({ x: dp.date, y: dp.value })),
      },
    ],
  };
}
