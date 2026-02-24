import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { BodyRecord, ChartRange } from '../../types';
import { extractBodyFatWeightData } from '../../utils/chartHelpers';
import { CHART_COLORS } from '../../utils/chartHelpers';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface BodyFatChartProps {
  records: BodyRecord[];
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}

export function BodyFatChart({ records, range, onRangeChange }: BodyFatChartProps) {
  const dataPoints = extractBodyFatWeightData(records);

  const chartData = {
    datasets: [
      {
        label: '體脂肪重量',
        data: dataPoints.map((dp) => ({ x: dp.date, y: dp.value })),
        borderColor: CHART_COLORS.bodyFat,
        backgroundColor: CHART_COLORS.bodyFat + '33',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '體脂肪重量變化趨勢',
        font: {
          size: 18,
          weight: 'bold' as const,
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
        callbacks: {
          label: (context: any) => {
            return `體脂肪：${context.parsed.y.toFixed(2)} kg`;
          },
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
          text: '體脂肪重量 (kg)',
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

  const rangeOptions: { value: ChartRange; label: string }[] = [
    { value: '7days', label: '7天' },
    { value: '30days', label: '30天' },
    { value: '90days', label: '90天' },
    { value: 'all', label: '全部' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* 时间范围选择器 */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onRangeChange(option.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                range === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表 */}
      <div className="h-[400px]">
        {dataPoints.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            暫無數據可顯示
          </div>
        )}
      </div>
    </div>
  );
}
