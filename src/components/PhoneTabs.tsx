import { CATEGORY_LABEL, IMPULSE_LABEL, type Api, type Category, type Consent } from '../store'
import { CATEGORY_OPTIONS } from '../data/scenarios'
import { strategyById } from '../data/strategies'
import { CONSENT_TEXT } from '../widgets/Widgets'
import { detectPatterns } from '../logic/engine'

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function RecordView({ api }: { api: Api }) {
  const { entries, consent } = api.s
  const patterns = consent.patterns ? detectPatterns(entries) : []
  const patch = (id: string, p: Partial<(typeof entries)[number]>) =>
    api.set((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...p } : e)) }))

  if (!consent.record)
    return (
      <div className="tab-pane">
        <h3>My record</h3>
        <p className="muted">Your personal record is off. Nothing from your conversations is stored. You can turn it on under Privacy.</p>
      </div>
    )

  return (
    <div className="tab-pane">
      <h3>My record</h3>
      <p className="muted">
        Everything the Companion remembers about you. Change anything that's wrong, or delete it. Patterns are recalculated straight away.
      </p>
      <div className="derived">
        <b>Derived from this:</b>{' '}
        {patterns.length ? patterns.map((p) => `possible ${CATEGORY_LABEL[p.category].toLowerCase()} pattern (${p.evidence.length} reports)`).join(', ') : 'no patterns'}
      </div>
      {entries.length === 0 && <p className="muted">No entries.</p>}
      {[...entries].reverse().map((e) => (
        <div key={e.id} className="entry">
          <div className="entry-head">
            <span className="date">{fmt(e.date)}</span>
            <select
              value={e.category}
              onChange={(ev) => {
                patch(e.id, { category: ev.target.value as Category })
                api.log(`User corrected an entry's category to "${CATEGORY_LABEL[ev.target.value as Category]}".`)
              }}
            >
              {CATEGORY_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button
              className="icon"
              title="Delete entry"
              onClick={() => {
                api.set((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== e.id) }))
                api.log(`User deleted the entry from ${fmt(e.date)}.`)
              }}
            >
              ✕
            </button>
          </div>
          <div className="entry-body">
            <div>{e.situation}</div>
            <div className="muted">
              {e.emotions.join(', ') || 'no feelings noted'} · {IMPULSE_LABEL[e.impulse]}
              {e.impulse !== 'none' && (
                <>
                  {' '}
                  <select value={e.intensity} onChange={(ev) => patch(e.id, { intensity: Number(ev.target.value) })}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}/5</option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <div className="muted">
              {e.action}
              {e.strategyId && ` · tried "${strategyById(e.strategyId)?.title}": ${e.helpful === 'yes' ? 'helped' : e.helpful === 'somewhat' ? 'a little' : "didn't help"}`}
            </div>
          </div>
        </div>
      ))}
      {entries.length > 0 && (
        <button
          className="danger full"
          onClick={() => {
            api.set((s) => ({ ...s, entries: [], patternStatus: {} }))
            api.log('User deleted the whole record.')
          }}
        >
          Delete whole record
        </button>
      )}
    </div>
  )
}

const FLOWS: [string, (c: Consent) => string][] = [
  ['You', () => 'Always'],
  ['The Companion (AI)', (c) => (c.record ? 'Your record, to personalise' : 'Only the current chat')],
  ['Other users', (c) => (c.contribute ? 'Anonymous ratings in groups of 20+' : 'Never')],
  ['Featback expert-by-experience', (c) => (c.clinician ? 'Summaries you confirm each time' : 'Only in a safety hand-off you confirm')],
  ['Parents, school, employer', () => 'Never'],
  ['Researchers', () => 'Only with a separate study consent'],
  ['Advertisers, insurers', () => 'Never'],
]

export function PrivacyView({ api }: { api: Api }) {
  const c = api.s.consent
  const toggle = (k: keyof Consent) => {
    const next = { ...c, [k]: !c[k] }
    if (k === 'record' && !next.record) {
      if (!window.confirm('Turning off your record deletes all saved reports and patterns. Continue?')) return
      next.patterns = false
      next.contribute = false
      api.set((s) => ({ ...s, consent: next, entries: [], patternStatus: {} }))
      api.log('Record switched off: all entries deleted.')
      return
    }
    api.set((s) => ({ ...s, consent: next }))
    api.log(`Consent "${CONSENT_TEXT[k].title}" ${next[k] ? 'given' : 'withdrawn'}.`)
  }
  return (
    <div className="tab-pane">
      <h3>Privacy & consent</h3>
      {(Object.keys(CONSENT_TEXT) as (keyof Consent)[]).map((k) => {
        const t = CONSENT_TEXT[k]
        const disabled = t.requires && !c[t.requires]
        return (
          <label key={k} className={`toggle-row ${disabled ? 'disabled' : ''}`}>
            <input type="checkbox" checked={c[k]} disabled={!!disabled} onChange={() => toggle(k)} />
            <span>
              <b>{t.title}</b>
              <small>{t.body}</small>
            </span>
          </label>
        )
      })}
      <h4>Who can see what</h4>
      <table className="kv flows">
        <tbody>
          {FLOWS.map(([who, f]) => (
            <tr key={who}>
              <th>{who}</th>
              <td className={f(c) === 'Never' ? 'never' : ''}>{f(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
