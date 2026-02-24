import type { ChartOptions } from 'chart.js';
import type { BodyRecord, ChartDataPoint } from '../types';
import { calculateBodyFatWeight } from './calculations';
import { formatDate } from './dateUtils';

/**
 * 图表颜色配置
 */
export const CHART_COLORS = {
  weight: '#3b82f6', // 蓝色
  bodyFat: '#ef4444', // 红色
  muscleMass: '#10b981', // 绿色
  water: '#06b6d4', // 青色
  bodyFatPercentage: '#f59e0b', // 橙色
};

/**
 * 创建折线图的基础配置
 * @param title 图表标题
 * @param yAxisLabel Y轴标签
 * @returns Chart.js配置对象
 */
export function createLineChartOptions(
  title: string,
  yAxisLabel: string
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
 * 从记录数组提取体重数据点
 * @param records 记录数组
 * @returns 数据点数组
 */
export function extractWeightData(records: BodyRecord[]): ChartDataPoint[] {
  return records.map(record => ({
    date: record.date,
    value: record.weight,
  }));
}

/**
 * 从记录数组提取体脂肪重量数据点
 * @param records 记录数组
 * @returns 数据点数组
 */
export function extractBodyFatWeightData(records: BodyRecord[]): ChartDataPoint[] {
  return records.map(record => ({
    date: record.date,
    value: calculateBodyFatWeight(record.weight, record.body_fat_percentage),
  }));
}

/**
 * 从记录数组提取体脂率数据点
 * @param records 记录数组
 * @returns 数据点数组
 */
export function extractBodyFatPercentageData(records: BodyRecord[]): ChartDataPoint[] {
  return records
    .filter(record => record.body_fat_percentage !== undefined)
    .map(record => ({
      date: record.date,
      value: record.body_fat_percentage!,
    }));
}

/**
 * 从记录数组提取肌肉量数据点
 * @param records 记录数组
 * @returns 数据点数组
 */
export function extractMuscleMassData(records: BodyRecord[]): ChartDataPoint[] {
  return records
    .filter(record => record.muscle_mass !== undefined)
    .map(record => ({
      date: record.date,
      value: record.muscle_mass!,
    }));
}

/**
 * 从记录数组提取含水量数据点
 * @param records 记录数组
 * @returns 数据点数组
 */
export function extractWaterPercentageData(records: BodyRecord[]): ChartDataPoint[] {
  return records
    .filter(record => record.water_percentage !== undefined)
    .map(record => ({
      date: record.date,
      value: record.water_percentage!,
    }));
}

/**
 * 将数据点数组转换为Chart.js数据格式
 * @param dataPoints 数据点数组
 * @returns Chart.js数据对象
 */
export function formatChartData(dataPoints: ChartDataPoint[]) {
  return {
    labels: dataPoints.map(dp => dp.date),
    datasets: [
      {
        data: dataPoints.map(dp => ({ x: dp.date, y: dp.value })),
      },
    ],
  };
}
