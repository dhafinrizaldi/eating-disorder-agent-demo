import type { Scenario } from '../data/scenarios'
import { CATEGORY_LABEL, type PersonaState } from '../store'
import { detectPatterns } from '../logic/engine'

interface Props {
  scenario: Scenario
  nodeId: string | null
  state: PersonaState
  safety: string
}

const SAFETY_LABEL: Record<string, string> = {
  crisis: 'Crisis signal → crisis resources + human hand-off',
  medical: 'Medical warning sign → GP / 112 advice',
  'harmful-request': 'Pro-ED request → declined, safe alternative',
  ok: 'No risk detected → normal support flow',
}

export function Rationale({ scenario, nodeId, state, safety }: Props) {
  const node = nodeId ? scenario.nodes[nodeId] : null
  const patterns = state.consent.patterns ? detectPatterns(state.entries) : []
  const consentOn = Object.entries(state.consent).filter(([, v]) => v).map(([k]) => k)

  return (
    <aside className="rationale">
      <section>
        <div className="eyebrow">Goal of this use case</div>
        <p>{scenario.goal}</p>
      </section>

      <section>
        <div className="eyebrow">Design behind this step</div>
        {node?.notes?.length ? (
          node.notes.map((n, i) => (
            <div key={i} className="note">
              <span className={`tag tag-${n.tag.replace(/\s/g, '-').toLowerCase()}`}>{n.tag}</span>
              <span>{n.text}</span>
            </div>
          ))
        ) : (
          <p className="muted">{nodeId ? 'No specific requirement for this step.' : 'Waiting for the conversation…'}</p>
        )}
        {safety && (
          <div className="note">
            <span className="tag tag-safety">Safety check</span>
            <span>
              Your message was classified as <b>{safety}</b>: {SAFETY_LABEL[safety]}. (Demo uses keyword rules; a real system would use a validated classifier.)
            </span>
          </div>
        )}
      </section>

      <section>
        <div className="eyebrow">How the AI responded to feedback</div>
        {state.log.length === 0 ? (
          <p className="muted">Nothing yet. Choices, corrections and ratings will appear here with what they changed.</p>
        ) : (
          <ol className="log">
            {state.log.slice(-8).map((l) => (
              <li key={l.id}>{l.text}</li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <div className="eyebrow">User state: {state.name}</div>
        <p className="muted small">{state.blurb}</p>
        <div className="state-grid">
          <span>Consent</span>
          <span>{consentOn.length ? consentOn.join(', ') : 'none'}</span>
          <span>Reports</span>
          <span>{state.entries.length}</span>
          <span>Patterns</span>
          <span>{patterns.length ? patterns.map((p) => CATEGORY_LABEL[p.category]).join(', ') : 'none'}</span>
          <span>Suggestions</span>
          <span>
            {state.prefs.tone === 'gentle' ? 'gentle' : 'standard'}
            {state.prefs.proactive === null ? '' : state.prefs.proactive ? ', proactive' : ', on request only'}
          </span>
        </div>
      </section>
    </aside>
  )
}
