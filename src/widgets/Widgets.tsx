import { useEffect, useState, type ReactElement } from 'react'
import type { WidgetId } from '../data/scenarios'
import { CATEGORY_OPTIONS } from '../data/scenarios'
import { CATEGORY_LABEL, IMPULSE_LABEL, type Api, type Category, type Consent } from '../store'
import { LIBRARY_VERSION, MIN_GROUP } from '../data/strategies'
import { detectPatterns, PATTERN_RULE, rankStrategies, type Ranked } from '../logic/engine'

interface WProps {
  api: Api
  goto: (to: string, say?: string) => void
  active: boolean
  props: Record<string, unknown>
}

export function Widget({ id, ...rest }: WProps & { id: WidgetId }) {
  const C = REGISTRY[id]
  return <C {...rest} />
}

// ---------- Consent ----------

export const CONSENT_TEXT: Record<keyof Consent, { title: string; body: string; requires?: keyof Consent }> = {
  record: {
    title: 'Keep a personal record',
    body: 'Save short summaries of situations you describe (what happened, feelings, urges, what you did). Only you and the Companion can see them.',
  },
  patterns: {
    title: 'Suggest possible patterns',
    body: 'Let the Companion look for recurring links in your record and ask you whether they fit. It will never decide for you.',
    requires: 'record',
  },
  similar: {
    title: 'Use anonymous feedback from similar users',
    body: 'Order approved strategies using what helped other people with similar reports (groups of at least 20 people).',
  },
  contribute: {
    title: 'Let my ratings help others',
    body: 'Add your anonymous "did this help?" ratings to the group statistics. Your text is never shared.',
    requires: 'record',
  },
  clinician: {
    title: 'Share summaries with my Featback expert-by-experience',
    body: 'Only when you confirm each time. No full chats unless you choose.',
  },
}

function ConsentWidget({ api, goto, active }: WProps) {
  const [c, setC] = useState<Consent>(api.s.consent)
  const toggle = (k: keyof Consent) =>
    setC((prev) => {
      const next = { ...prev, [k]: !prev[k] }
      if (k === 'record' && !next.record) {
        next.patterns = false
        next.contribute = false
      }
      return next
    })
  return (
    <div className="card">
      <div className="card-title">Your choices</div>
      {(Object.keys(CONSENT_TEXT) as (keyof Consent)[]).map((k) => {
        const t = CONSENT_TEXT[k]
        const disabled = !active || (t.requires && !c[t.requires])
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
      <div className="fine">Health data is a special category under GDPR Art. 9, which is why each purpose needs its own explicit consent. You can withdraw it at any time.</div>
      <button
        className="primary"
        disabled={!active}
        onClick={() => {
          api.set((s) => ({ ...s, consent: c }))
          api.log(`Consent set: ${Object.entries(c).filter(([, v]) => v).map(([k]) => k).join(', ') || 'nothing'}.`)
          goto('n3', 'Save my choices')
        }}
      >
        Save my choices
      </button>
    </div>
  )
}

// ---------- Entry review ----------

function EntryReview({ api, goto, active }: WProps) {
  const d = api.s.draft
  const [category, setCategory] = useState<Category>((d.category as Category) ?? 'other')
  const rows: [string, string][] = [
    ['Situation', d.situation ?? '(skipped)'],
    ['Feelings', d.emotions?.length ? d.emotions.join(', ') : '(skipped)'],
    ['Urge', d.impulse ? `${IMPULSE_LABEL[d.impulse]}${d.impulse !== 'none' ? `, strength ${d.intensity}/5` : ''}` : '(skipped)'],
    ['What you did', d.action ?? '(skipped)'],
  ]
  const save = () => {
    api.set((s) => ({
      ...s,
      entries: [
        ...s.entries,
        {
          id: `e${Date.now()}`,
          date: '2026-09-28',
          situation: d.situation ?? '',
          category,
          emotions: d.emotions ?? [],
          impulse: d.impulse ?? 'none',
          intensity: d.intensity ?? 1,
          action: d.action ?? '',
        },
      ],
      draft: {},
    }))
    api.log(`New entry saved (${CATEGORY_LABEL[category]}). Patterns recalculated.`)
    goto('n8', 'Save it')
  }
  return (
    <div className="card">
      <div className="card-title">Entry for 28 Sep 2026</div>
      <table className="kv">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
          <tr>
            <th>Type of situation</th>
            <td>
              <select value={category} disabled={!active} onChange={(e) => setCategory(e.target.value as Category)}>
                {CATEGORY_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <div className="fine">Suggested by the AI. Change it if it doesn't fit.</div>
            </td>
          </tr>
        </tbody>
      </table>
      {!api.s.consent.record && <div className="warn">Your personal record is off, so this won't be stored.</div>}
      <div className="btn-row">
        <button className="primary" disabled={!active || !api.s.consent.record} onClick={save}>Save it</button>
        <button
          disabled={!active}
          onClick={() => {
            api.set((s) => ({ ...s, draft: {} }))
            api.log('User chose not to save the entry. Nothing stored.')
            goto('n8', "Don't save")
          }}
        >
          Don't save
        </button>
      </div>
    </div>
  )
}

// ---------- Pattern ----------

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function PatternWidget({ api, goto, active }: WProps) {
  const [why, setWhy] = useState(false)
  // Earlier cards in the chat keep showing what they showed at the time.
  const [snap, setSnap] = useState(api.s)
  useEffect(() => {
    if (active) setSnap(api.s)
  }, [active, api.s])
  const patterns = snap.consent.patterns ? detectPatterns(snap.entries) : []
  const p = patterns[0]
  if (!snap.consent.patterns)
    return (
      <div className="card">
        <div className="card-title">Pattern suggestions are off</div>
        <p>You switched off pattern suggestions, so nothing is analysed.</p>
      </div>
    )
  if (!p)
    return (
      <div className="card">
        <div className="card-title">No recurring pattern right now</div>
        <p>Based on your current record, there is not enough evidence for a pattern (at least {PATTERN_RULE.minReports} similar reports are needed).</p>
        <div className="fine">The earlier suggestion was withdrawn because the record changed.</div>
      </div>
    )
  return (
    <div className="card pattern">
      <div className="card-title">A possible pattern</div>
      <p className="pattern-text">
        {p.text} <b>Do you recognise this pattern?</b>
      </p>
      <div className="evidence">
        {p.evidence.map((e) => (
          <div key={e.id} className="ev">
            <span className="date">{fmt(e.date)}</span>
            <span>{e.situation}</span>
            <span className="meter" title={`strength ${e.impulse === 'none' ? 0 : e.intensity}/5`}>
              {'●'.repeat(e.impulse === 'none' ? 0 : e.intensity)}
              <span className="dim">{'●'.repeat(5 - (e.impulse === 'none' ? 0 : e.intensity))}</span>
            </span>
          </div>
        ))}
      </div>
      <button className="link" onClick={() => setWhy(!why)}>{why ? 'Hide' : 'Why am I seeing this?'}</button>
      {why && (
        <div className="why">
          Average urge strength after {CATEGORY_LABEL[p.category].toLowerCase()} situations: <b>{p.avg.toFixed(1)}/5</b>, compared with{' '}
          <b>{p.baseline.toFixed(1)}/5</b> after other situations. Rule: at least {PATTERN_RULE.minReports} reports and a difference of at least{' '}
          {PATTERN_RULE.minDifference} points.
          <br />
          This is a link in your own reports, <b>not proof of a cause</b> and not a diagnosis.
        </div>
      )}
      <div className="btn-col">
        {[
          ['yes', 'Yes, I recognise this', 'confirmed'],
          ['partly', 'Partly', 'partly'],
          ['no', "No, this doesn't fit", 'rejected'],
        ].map(([to, label, status]) => (
          <button
            key={to}
            disabled={!active}
            onClick={() => {
              api.set((s) => ({ ...s, patternStatus: { ...s.patternStatus, [p.id]: status as 'confirmed' } }))
              api.log(`Pattern "${CATEGORY_LABEL[p.category]}" marked ${status} by user.`)
              goto(to, label)
            }}
          >
            {label}
          </button>
        ))}
        <button
          disabled={!active}
          onClick={() => {
            api.openTab('record')
            goto('fix', 'Something in my reports is wrong')
          }}
        >
          Something in my reports is wrong
        </button>
      </div>
    </div>
  )
}

// ---------- Recommendations ----------

const BASIS_LABEL = { personal: 'Your feedback', similar: 'Similar users', default: 'No data yet' }

function Recommendations({ api, goto, active, props }: WProps) {
  const category = props.category as Category
  const compare = !!props.compare
  const live = rankStrategies(category, api.s).slice(0, 3)
  // Freeze what was shown once the widget is no longer the active step.
  const [shown, setShown] = useState<Ranked[]>(live)
  useEffect(() => {
    if (active) setShown(live)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, api.s])
  const [open, setOpen] = useState<string | null>(null)
  const prev = api.s.lastShownRanking
  const tone = api.s.prefs.tone

  return (
    <div className="card">
      <div className="card-title">
        {compare ? 'Updated order for body-image moments' : tone === 'gentle' ? 'A few ideas, if you want them' : 'Strategies you could try'}
      </div>
      {shown.map((r, i) => {
        const before = prev.indexOf(r.strategy.id)
        const move = compare && before >= 0 ? before - i : 0
        return (
          <div key={r.strategy.id} className={`strat ${i === 0 && !compare ? 'top' : ''}`}>
            <div className="strat-head" onClick={() => setOpen(open === r.strategy.id ? null : r.strategy.id)}>
              <span className="rank">{i + 1}</span>
              <span className="strat-title">{r.strategy.title}</span>
              {compare && (
                <span className={`move ${move > 0 ? 'up' : move < 0 ? 'down' : ''}`}>
                  {move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : before < 0 ? 'new' : '='}
                </span>
              )}
            </div>
            <div className={`basis ${r.basis}`}>
              {BASIS_LABEL[r.basis]} · {r.detail}
            </div>
            {open === r.strategy.id && (
              <div className="strat-body">
                {r.strategy.description}
                <div className="source">Source: {r.strategy.basis}</div>
              </div>
            )}
            {!compare && (
              <button
                className="small"
                disabled={!active}
                onClick={() => {
                  api.set((s) => ({ ...s, draft: { ...s.draft, strategyId: r.strategy.id }, lastShownRanking: shown.map((x) => x.strategy.id) }))
                  api.log(`User chose "${r.strategy.title}" (ranked #${i + 1}).`)
                  goto(props.pickTo as string, `I'll try "${r.strategy.title}"`)
                }}
              >
                I'll try this
              </button>
            )}
          </div>
        )
      })}
      <div className="fine">
        Tap a strategy for details. All from: {LIBRARY_VERSION}. The Companion only orders these; it never invents new advice.
      </div>
      {!compare && (
        <div className="btn-row">
          <button disabled={!active} onClick={() => goto(props.noneTo as string, 'None of these')}>None of these</button>
          <button disabled={!active} onClick={() => goto(props.personTo as string, "I'd rather talk to a person")}>Talk to a person</button>
        </div>
      )}
    </div>
  )
}

// ---------- Similar-user consent ----------

function SimilarConsent({ api, goto, active }: WProps) {
  const [contribute, setContribute] = useState(false)
  const decide = (use: boolean) => {
    api.set((s) => ({ ...s, consent: { ...s.consent, similar: use, contribute: contribute && s.consent.record } }))
    api.log(use ? 'Consent given: use aggregated similar-user feedback for ranking.' : 'Similar-user feedback declined. Default clinician order used.')
    if (contribute) api.log(api.s.consent.record ? 'Consent given: contribute own ratings to group statistics.' : 'Contribute requested, but record is off, so there is nothing to contribute.')
    goto('n2', use ? 'Yes, use similar-user info' : 'No, keep it to me')
  }
  return (
    <div className="card">
      <div className="card-title">New use of data: may I?</div>
      <table className="kv">
        <tbody>
          <tr><th>What is used</th><td>How helpful approved strategies were for people whose reports are similar to yours (type of situation, urge strength). No messages, names or ages.</td></tr>
          <tr><th>Who</th><td>Only groups of at least {MIN_GROUP} people, so no one can be singled out.</td></tr>
          <tr><th>For what</th><td>Only to change the order of clinician-approved strategies shown to you.</td></tr>
          <tr><th>How long</th><td>Until you switch it off under Privacy.</td></tr>
        </tbody>
      </table>
      <label className={`toggle-row ${!active ? 'disabled' : ''}`}>
        <input type="checkbox" checked={contribute} disabled={!active} onChange={() => setContribute(!contribute)} />
        <span>
          <b>Also let my ratings help others (separate choice)</b>
          <small>Your anonymous "did this help?" answers are added to group statistics.</small>
        </span>
      </label>
      <div className="btn-row">
        <button className="primary" disabled={!active} onClick={() => decide(true)}>Yes, use it</button>
        <button disabled={!active} onClick={() => decide(false)}>No, keep it to me</button>
      </div>
    </div>
  )
}

// ---------- Safety cards ----------

function Crisis() {
  return (
    <div className="card crisis">
      <div className="card-title">Talk to someone now</div>
      <div className="res">
        <b>113 Suicide Prevention</b>
        <span>Call <b>0800-0113</b> (free, 24/7) or chat at 113.nl</span>
      </div>
      <div className="res">
        <b>In immediate danger?</b>
        <span>Call <b>112</b></span>
      </div>
      <div className="res">
        <b>Your Featback expert-by-experience</b>
        <span>Can be notified with your permission</span>
      </div>
      <div className="fine">Pattern suggestions and strategy recommendations are paused during this conversation.</div>
    </div>
  )
}

function Medical() {
  return (
    <div className="card crisis">
      <div className="card-title">Physical warning signs</div>
      <p>Dizziness and fainting after not eating can mean your body needs medical care.</p>
      <div className="res"><b>Today</b><span>Call your GP (huisarts), or the out-of-hours GP service (huisartsenpost) in the evening or weekend.</span></div>
      <div className="res"><b>Chest pain, palpitations, fainting again</b><span>Call <b>112</b></span></div>
      <div className="fine">The Companion cannot judge how serious this is. A doctor can.</div>
    </div>
  )
}

function ClinicianView({ api, goto, active }: WProps) {
  const [full, setFull] = useState(false)
  const cats = [...new Set(api.s.entries.map((e) => CATEGORY_LABEL[e.category]))]
  const themes = !api.s.consent.record ? 'Not available (record is off)' : cats.length ? cats.join(', ') : 'No reports stored'
  return (
    <div className="card">
      <div className="card-title">What your expert-by-experience would see</div>
      <div className="preview">
        <div className="preview-head">Featback care dashboard · new flag</div>
        <table className="kv">
          <tbody>
            <tr><th>User</th><td>Sam (pseudonym)</td></tr>
            <tr><th>Flag</th><td>Asked for human contact after a safety response</td></tr>
            <tr><th>Recent themes</th><td>{themes}</td></tr>
            <tr><th>Full conversation</th><td>{full ? 'Shared by Sam' : 'Not shared'}</td></tr>
          </tbody>
        </table>
      </div>
      <label className={`toggle-row ${!active ? 'disabled' : ''}`}>
        <input type="checkbox" checked={full} disabled={!active} onChange={() => setFull(!full)} />
        <span>
          <b>Also share today's full conversation</b>
          <small>Optional. Only this conversation, only with this person.</small>
        </span>
      </label>
      <div className="fine">Never shared with: parents, school, employer, insurers or researchers.</div>
      <div className="btn-row">
        <button
          className="primary"
          disabled={!active}
          onClick={() => {
            api.log(`Hand-off sent to expert-by-experience (${full ? 'summary + full chat' : 'summary only'}), with the user's confirmation.`)
            goto('sent', 'Send it')
          }}
        >
          Send it
        </button>
        <button disabled={!active} onClick={() => goto('end', "Don't send")}>Don't send</button>
      </div>
    </div>
  )
}

// ---------- Data rights ----------

function RecordSummary({ api }: WProps) {
  const s = api.s
  const patterns = s.consent.patterns ? detectPatterns(s.entries) : []
  const download = () => {
    const blob = new Blob([JSON.stringify({ consent: s.consent, entries: s.entries, customStrategies: s.customStrategies, patternStatus: s.patternStatus }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'my-companion-data.json'
    a.click()
  }
  return (
    <div className="card">
      <div className="card-title">Everything stored about you</div>
      <table className="kv">
        <tbody>
          <tr><th>Reports</th><td>{s.entries.length}</td></tr>
          <tr><th>Possible patterns</th><td>{patterns.length ? patterns.map((p) => CATEGORY_LABEL[p.category]).join(', ') : 'none'}</td></tr>
          <tr><th>Strategy ratings</th><td>{s.entries.filter((e) => e.helpful).length}</td></tr>
          <tr><th>Own strategies</th><td>{s.customStrategies.length ? s.customStrategies.join(', ') : 'none'}</td></tr>
          <tr><th>Shared with others</th><td>{s.consent.contribute ? 'Anonymous ratings in group statistics' : 'Nothing'}</td></tr>
        </tbody>
      </table>
      <div className="btn-row">
        <button onClick={() => api.openTab('record')}>Open My record</button>
        <button onClick={download}>Download (JSON)</button>
      </div>
    </div>
  )
}

function DeleteConfirm({ api, goto, active }: WProps) {
  return (
    <div className="card">
      <div className="btn-row">
        <button
          className="danger"
          disabled={!active}
          onClick={() => {
            api.set((s) => ({ ...s, entries: [], customStrategies: [], patternStatus: {}, consent: { ...s.consent, contribute: false } }))
            api.log('Right to erasure: all entries, patterns and own strategies deleted.')
            goto('deleted', 'Yes, delete everything')
          }}
        >
          Yes, delete everything
        </button>
        <button disabled={!active} onClick={() => goto('end', 'No, keep it')}>No, keep it</button>
      </div>
    </div>
  )
}

const REGISTRY: Record<WidgetId, (p: WProps) => ReactElement> = {
  consent: ConsentWidget,
  entryReview: EntryReview,
  pattern: PatternWidget,
  recommendations: Recommendations,
  similarConsent: SimilarConsent,
  crisis: Crisis,
  medical: Medical,
  clinicianView: ClinicianView,
  recordSummary: RecordSummary,
  deleteConfirm: DeleteConfirm,
}

