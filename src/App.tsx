import { useState } from 'react'
import { SCENARIOS } from './data/scenarios'
import { makeApi, useStore, type Tab } from './store'
import { Chat } from './components/Chat'
import { PrivacyView, RecordView } from './components/PhoneTabs'
import { Rationale } from './components/Rationale'
import { DesignBasis, Evaluation, Interfaces } from './pages/Pages'

type Page = 'demo' | 'interfaces' | 'evaluation' | 'basis'

const PAGES: [Page, string][] = [
  ['demo', 'Use cases'],
  ['interfaces', 'Interfaces'],
  ['evaluation', 'Evaluation'],
  ['basis', 'Design basis'],
]

export default function App() {
  const [page, setPage] = useState<Page>('demo')
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">F</div>
          <div>
            <div className="brand-title">Featback Companion</div>
            <div className="brand-sub">Concept demo · 5ARF0 Ethics of AI · Group EE</div>
          </div>
        </div>
        <nav>
          {PAGES.map(([id, label]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      {page === 'demo' && <Demo />}
      {page === 'interfaces' && <Interfaces />}
      {page === 'evaluation' && <Evaluation />}
      {page === 'basis' && <DesignBasis />}
    </div>
  )
}

function Demo() {
  const store = useStore()
  const [idx, setIdx] = useState(0)
  const [tab, setTab] = useState<Tab>('chat')
  const [node, setNode] = useState<string | null>(null)
  const [safety, setSafety] = useState('')
  const [runKey, setRunKey] = useState(0)
  const scenario = SCENARIOS[idx]
  const api = makeApi(store, scenario.persona, setTab)

  const select = (i: number) => {
    setIdx(i)
    setTab('chat')
    setNode(null)
    setRunKey((k) => k + 1)
  }

  return (
    <main className="demo">
      <aside className="scenarios">
        <div className="eyebrow">Use cases</div>
        {SCENARIOS.map((s, i) => (
          <button key={s.id} className={`scenario ${i === idx ? 'active' : ''}`} onClick={() => select(i)}>
            <span className="num">{i + 1}</span>
            <span>
              <b>{s.title}</b>
              <small>{s.short}</small>
              <small className="persona">as {store.personas[s.persona].name}</small>
            </span>
          </button>
        ))}
        <div className="side-actions">
          <button onClick={() => select(idx)}>↻ Restart this use case</button>
          <button
            onClick={() => {
              store.reset()
              select(idx)
            }}
          >
            Reset all demo data
          </button>
        </div>
        <p className="muted small">
          Sam and Noor keep their data across use cases. Corrections, deletions and ratings in one use case carry over to the next.
        </p>
      </aside>

      <section className="phone-col">
        <div className="phone">
          <div className="phone-top">
            <span className="avatar">C</span>
            <div>
              <div className="phone-title">Companion</div>
              <div className="phone-sub">Automated support · not a therapist</div>
            </div>
          </div>
          <div className="phone-tabs">
            {(['chat', 'record', 'privacy'] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t === 'chat' ? 'Chat' : t === 'record' ? 'My record' : 'Privacy'}
              </button>
            ))}
          </div>
          <div className="phone-body">
            <div style={{ display: tab === 'chat' ? 'contents' : 'none' }}>
              <Chat
                key={runKey}
                scenario={scenario}
                api={api}
                onNode={setNode}
                onSafety={setSafety}
                onNext={idx < SCENARIOS.length - 1 ? () => select(idx + 1) : undefined}
              />
            </div>
            {tab === 'record' && <RecordView api={api} />}
            {tab === 'privacy' && <PrivacyView api={api} />}
          </div>
          <div className="phone-foot">In crisis? Call 113 (0800-0113) or 112</div>
        </div>
      </section>

      <Rationale scenario={scenario} nodeId={node} state={store.personas[scenario.persona]} safety={safety} />
    </main>
  )
}
