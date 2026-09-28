import { createContext, useContext, useState, type ReactNode } from 'react'

export type Category = 'body-image' | 'social-eating' | 'stress' | 'other'
export type Impulse = 'restrict' | 'binge' | 'compensate' | 'none'
export type Rating = 'yes' | 'somewhat' | 'no'
export type PersonaId = 'sam' | 'noor'
export type Tab = 'chat' | 'record' | 'privacy'

export const CATEGORY_LABEL: Record<Category, string> = {
  'body-image': 'Body image',
  'social-eating': 'Eating with others',
  stress: 'Stress',
  other: 'Other',
}

export const IMPULSE_LABEL: Record<Impulse, string> = {
  restrict: 'Urge to restrict',
  binge: 'Urge to binge',
  compensate: 'Urge to compensate',
  none: 'No urge',
}

export interface Entry {
  id: string
  date: string
  situation: string
  category: Category
  emotions: string[]
  impulse: Impulse
  intensity: number
  action: string
  strategyId?: string
  helpful?: Rating
}

export interface Consent {
  record: boolean
  patterns: boolean
  similar: boolean
  contribute: boolean
  clinician: boolean
}

export interface LogItem {
  id: number
  text: string
}

export interface PersonaState {
  name: string
  blurb: string
  consent: Consent
  entries: Entry[]
  customStrategies: string[]
  patternStatus: Record<string, 'confirmed' | 'partly' | 'rejected' | 'snoozed'>
  prefs: { proactive: boolean | null; tone: 'standard' | 'gentle' }
  draft: Partial<Entry>
  lastShownRanking: string[]
  log: LogItem[]
}

const SAM_ENTRIES: Entry[] = [
  { id: 'e1', date: '2026-09-02', situation: 'Saw photos of myself from a party', category: 'body-image', emotions: ['ashamed'], impulse: 'restrict', intensity: 4, action: 'Skipped lunch', strategyId: 's7', helpful: 'no' },
  { id: 'e2', date: '2026-09-06', situation: 'Deadline for a school project', category: 'stress', emotions: ['stressed'], impulse: 'none', intensity: 1, action: 'Took a short break' },
  { id: 'e3', date: '2026-09-09', situation: 'Trying on clothes in a shop', category: 'body-image', emotions: ['anxious', 'ashamed'], impulse: 'restrict', intensity: 5, action: 'Ate less at dinner', strategyId: 's4', helpful: 'yes' },
  { id: 'e4', date: '2026-09-13', situation: 'Birthday dinner with family', category: 'social-eating', emotions: ['tense'], impulse: 'restrict', intensity: 2, action: 'Ate with family' },
  { id: 'e5', date: '2026-09-17', situation: 'Comment about my weight at practice', category: 'body-image', emotions: ['hurt'], impulse: 'restrict', intensity: 4, action: 'Went home early', strategyId: 's1', helpful: 'somewhat' },
  { id: 'e6', date: '2026-09-21', situation: 'Argument with a friend', category: 'stress', emotions: ['sad'], impulse: 'binge', intensity: 2, action: 'Talked to my sister', strategyId: 's5', helpful: 'yes' },
  { id: 'e7', date: '2026-09-24', situation: 'Scrolling fitness influencers', category: 'body-image', emotions: ['inadequate'], impulse: 'restrict', intensity: 3, action: 'Put my phone away', strategyId: 's4', helpful: 'yes' },
]

const base = {
  customStrategies: [],
  patternStatus: {},
  prefs: { proactive: null, tone: 'standard' as const },
  draft: {},
  lastShownRanking: [],
  log: [],
}

export const seed = (): Record<PersonaId, PersonaState> => ({
  sam: {
    ...base,
    name: 'Sam',
    blurb: '19, on a waiting list for 6 weeks, has used the Companion for about 4 weeks.',
    consent: { record: true, patterns: true, similar: false, contribute: false, clinician: false },
    entries: SAM_ENTRIES,
  },
  noor: {
    ...base,
    name: 'Noor',
    blurb: '16, just found Featback, has never had treatment. No reports yet.',
    consent: { record: false, patterns: false, similar: false, contribute: false, clinician: false },
    entries: [],
  },
})

export interface Api {
  s: PersonaState
  set: (fn: (s: PersonaState) => PersonaState) => void
  log: (text: string) => void
  openTab: (t: Tab) => void
}

interface Ctx {
  personas: Record<PersonaId, PersonaState>
  update: (id: PersonaId, fn: (s: PersonaState) => PersonaState) => void
  reset: () => void
}

const StoreCtx = createContext<Ctx | null>(null)
let logId = 0

export function StoreProvider({ children }: { children: ReactNode }) {
  const [personas, setPersonas] = useState(seed)
  const update: Ctx['update'] = (id, fn) => setPersonas((p) => ({ ...p, [id]: fn(p[id]) }))
  return <StoreCtx.Provider value={{ personas, update, reset: () => setPersonas(seed()) }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}

export function makeApi(ctx: Ctx, id: PersonaId, openTab: (t: Tab) => void): Api {
  const set = (fn: (s: PersonaState) => PersonaState) => ctx.update(id, fn)
  return {
    s: ctx.personas[id],
    set,
    log: (text) => set((s) => ({ ...s, log: [...s.log, { id: ++logId, text }] })),
    openTab,
  }
}
