type SyncSettingsProps = {
  t: (key: string) => string
  syncKey: string
  isFirebaseConfigured: boolean
  onSyncKeyChange: (value: string) => void
}

function SyncSettings({ t, syncKey, isFirebaseConfigured, onSyncKeyChange }: SyncSettingsProps) {
  return (
    <section className="card sync-card">
      <div className="sync-row">
        <label htmlFor="syncKey">{t('syncKey')}</label>
        <input
          id="syncKey"
          type="text"
          value={syncKey}
          onChange={(event) => onSyncKeyChange(event.target.value || 'my-profile')}
        />
      </div>
      <p className="hint">{t('syncHint')}</p>
      <p className="mode-badge">{isFirebaseConfigured ? t('cloudMode') : t('localMode')}</p>
      {!isFirebaseConfigured && <p className="warning">{t('firebaseMissing')}</p>}
    </section>
  )
}

export default SyncSettings
