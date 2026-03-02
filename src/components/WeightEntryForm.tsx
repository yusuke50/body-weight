type WeightEntryFormProps = {
  t: (key: string) => string
  date: string
  totalWeightKg: string
  bodyFatPct: string
  muscleMassKg: string
  bodyWaterPct: string
  errorMessage: string
  onDateChange: (value: string) => void
  onTotalWeightChange: (value: string) => void
  onBodyFatChange: (value: string) => void
  onMuscleMassChange: (value: string) => void
  onBodyWaterChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

function WeightEntryForm({
  t,
  date,
  totalWeightKg,
  bodyFatPct,
  muscleMassKg,
  bodyWaterPct,
  errorMessage,
  onDateChange,
  onTotalWeightChange,
  onBodyFatChange,
  onMuscleMassChange,
  onBodyWaterChange,
  onSubmit,
}: WeightEntryFormProps) {
  return (
    <section className="card">
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          {t('date')}
          <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <label>
          {t('totalWeight')}
          <input
            type="number"
            step="0.1"
            min="0"
            value={totalWeightKg}
            onChange={(event) => onTotalWeightChange(event.target.value)}
          />
        </label>
        <label>
          {t('bodyFatPct')}
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={bodyFatPct}
            onChange={(event) => onBodyFatChange(event.target.value)}
          />
        </label>
        <label>
          {t('muscleMass')}
          <input
            type="number"
            step="0.1"
            min="0"
            value={muscleMassKg}
            onChange={(event) => onMuscleMassChange(event.target.value)}
          />
        </label>
        <label>
          {t('bodyWaterPct')}
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={bodyWaterPct}
            onChange={(event) => onBodyWaterChange(event.target.value)}
          />
        </label>

        <button className="submit-button" type="submit">
          {t('addRecord')}
        </button>
      </form>
      {errorMessage && <p className="error">{errorMessage}</p>}
    </section>
  )
}

export default WeightEntryForm
