import type { WeightEntry } from '../types'

type WeightHistoryTableProps = {
  t: (key: string) => string
  tableData: WeightEntry[]
  onDelete: (entryId: string) => void
}

function WeightHistoryTable({ t, tableData, onDelete }: WeightHistoryTableProps) {
  return (
    <section className="card">
      <h2>{t('tableTitle')}</h2>
      {tableData.length === 0 ? (
        <p>{t('noData')}</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('totalWeight')}</th>
                <th>{t('bodyFatPct')}</th>
                <th>{t('muscleMass')}</th>
                <th>{t('bodyWaterPct')}</th>
                <th>{t('fatMass')}</th>
                <th>{t('leanMass')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.totalWeightKg.toFixed(2)}</td>
                  <td>{item.bodyFatPct.toFixed(2)}</td>
                  <td>{item.muscleMassKg?.toFixed(2) ?? '-'}</td>
                  <td>{item.bodyWaterPct?.toFixed(2) ?? '-'}</td>
                  <td>{item.fatMassKg.toFixed(2)}</td>
                  <td>{item.leanMassKg.toFixed(2)}</td>
                  <td>
                    <button type="button" onClick={() => onDelete(item.id)}>
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default WeightHistoryTable
