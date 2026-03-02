import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { WeightEntry } from '../types'

type WeightTrendChartProps = {
  t: (key: string) => string
  chartData: WeightEntry[]
}

function WeightTrendChart({ t, chartData }: WeightTrendChartProps) {
  return (
    <section className="card">
      <h2>{t('chartTitle')}</h2>
      {chartData.length === 0 ? (
        <p>{t('noData')}</p>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="kg" />
              <YAxis yAxisId="pct" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="kg" type="monotone" dataKey="totalWeightKg" name={t('totalWeight')} />
              <Line yAxisId="pct" type="monotone" dataKey="bodyFatPct" name={t('bodyFatPct')} />
              <Line yAxisId="kg" type="monotone" dataKey="fatMassKg" name={t('fatMass')} />
              <Line yAxisId="kg" type="monotone" dataKey="leanMassKg" name={t('leanMass')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default WeightTrendChart
