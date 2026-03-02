import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { WeightEntry } from './types'

const LOCAL_KEY = 'body-weight-tracker-entries'
const LOCAL_CHANGE_EVENT = 'body-weight-tracker-local-change'

function getLocalEntries() {
  const raw = localStorage.getItem(LOCAL_KEY)
  if (!raw) return [] as WeightEntry[]

  try {
    return JSON.parse(raw) as WeightEntry[]
  } catch {
    return [] as WeightEntry[]
  }
}

function saveLocalEntries(entries: WeightEntry[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries))
  window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT))
}

export function subscribeEntries(
  syncKey: string,
  onChange: (entries: WeightEntry[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onChange(getLocalEntries())
    const listener = () => onChange(getLocalEntries())
    window.addEventListener(LOCAL_CHANGE_EVENT, listener)
    return () => window.removeEventListener(LOCAL_CHANGE_EVENT, listener)
  }

  const entriesRef = collection(db, 'profiles', syncKey, 'entries')
  const q = query(entriesRef, orderBy('date', 'asc'))

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((item) => item.data() as WeightEntry)
    onChange(entries)
  })
}

export async function createEntry(syncKey: string, entry: WeightEntry) {
  if (!isFirebaseConfigured || !db) {
    const entries = getLocalEntries()
    entries.push(entry)
    entries.sort((a, b) => a.date.localeCompare(b.date))
    saveLocalEntries(entries)
    return
  }

  const entryRef = doc(db, 'profiles', syncKey, 'entries', entry.id)
  await setDoc(entryRef, entry)
}

export async function removeEntry(syncKey: string, entryId: string) {
  if (!isFirebaseConfigured || !db) {
    const entries = getLocalEntries().filter((item) => item.id !== entryId)
    saveLocalEntries(entries)
    return
  }

  const entryRef = doc(db, 'profiles', syncKey, 'entries', entryId)
  await deleteDoc(entryRef)
}
