import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import SyncSettings from './components/SyncSettings'
import WeightEntryForm from './components/WeightEntryForm'
import WeightHistoryTable from './components/WeightHistoryTable'
import WeightTrendChart from './components/WeightTrendChart'
import { isFirebaseConfigured } from './firebase'
import { createEntry, removeEntry, subscribeEntries } from './storage'
import type { WeightEntry } from './types'

function App() {
  const { t, i18n } = useTranslation()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [totalWeightKg, setTotalWeightKg] = useState('')
  const [bodyFatPct, setBodyFatPct] = useState('')
  const [muscleMassKg, setMuscleMassKg] = useState('')
  const [bodyWaterPct, setBodyWaterPct] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [syncKey, setSyncKey] = useState(
    () => localStorage.getItem('body-weight-sync-key') || 'my-profile',
  )

  useEffect(() => {
    localStorage.setItem('body-weight-sync-key', syncKey)
  }, [syncKey])

  useEffect(() => {
    const unsubscribe = subscribeEntries(syncKey, setEntries)
    return () => unsubscribe()
  }, [syncKey])

  const chartData = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  )

  const tableData = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!date || !totalWeightKg || !bodyFatPct) {
      setErrorMessage(t('requiredError'))
      return
    }

    const parsedTotalWeightKg = Number(totalWeightKg)
    const parsedBodyFatPct = Number(bodyFatPct)
    const parsedMuscleMassKg = muscleMassKg ? Number(muscleMassKg) : undefined
    const parsedBodyWaterPct = bodyWaterPct ? Number(bodyWaterPct) : undefined

    const hasInvalidOptionalValue =
      (parsedMuscleMassKg !== undefined && parsedMuscleMassKg <= 0) ||
      (parsedBodyWaterPct !== undefined && parsedBodyWaterPct <= 0)

    if (
      parsedTotalWeightKg <= 0 ||
      parsedBodyFatPct <= 0 ||
      parsedBodyFatPct > 100 ||
      hasInvalidOptionalValue
    ) {
      setErrorMessage(t('numericError'))
      return
    }

    const fatMassKg = Number(((parsedTotalWeightKg * parsedBodyFatPct) / 100).toFixed(2))
    const leanMassKg = Number((parsedTotalWeightKg - fatMassKg).toFixed(2))

    const entry: WeightEntry = {
      id: crypto.randomUUID(),
      date,
      totalWeightKg: Number(parsedTotalWeightKg.toFixed(2)),
      bodyFatPct: Number(parsedBodyFatPct.toFixed(2)),
      muscleMassKg: parsedMuscleMassKg,
      bodyWaterPct: parsedBodyWaterPct,
      fatMassKg,
      leanMassKg,
      createdAt: Date.now(),
    }

    try {
      await createEntry(syncKey, entry)
      setTotalWeightKg('')
      setBodyFatPct('')
      setMuscleMassKg('')
      setBodyWaterPct('')
    } catch {
      setErrorMessage(t('saveError'))
    }
  }

  async function handleDelete(entryId: string) {
    setErrorMessage('')

    try {
      await removeEntry(syncKey, entryId)
    } catch {
      setErrorMessage(t('deleteError'))
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>{t('appTitle')}</h1>
          <p>{t('appSubtitle')}</p>
        </div>
        <div className="language-switcher">
          <label htmlFor="lang">{t('language')}</label>
          <select
            id="lang"
            value={i18n.language.startsWith('zh') ? 'zh-TW' : 'en'}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
          >
            <option value="zh-TW">繁體中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </header>

      <SyncSettings
        t={t}
        syncKey={syncKey}
        isFirebaseConfigured={isFirebaseConfigured}
        onSyncKeyChange={setSyncKey}
      />

      <WeightEntryForm
        t={t}
        date={date}
        totalWeightKg={totalWeightKg}
        bodyFatPct={bodyFatPct}
        muscleMassKg={muscleMassKg}
        bodyWaterPct={bodyWaterPct}
        errorMessage={errorMessage}
        onDateChange={setDate}
        onTotalWeightChange={setTotalWeightKg}
        onBodyFatChange={setBodyFatPct}
        onMuscleMassChange={setMuscleMassKg}
        onBodyWaterChange={setBodyWaterPct}
        onSubmit={handleSubmit}
      />

      <WeightTrendChart t={t} chartData={chartData} />

      <WeightHistoryTable t={t} tableData={tableData} onDelete={handleDelete} />
    </main>
  )
}

export default App
