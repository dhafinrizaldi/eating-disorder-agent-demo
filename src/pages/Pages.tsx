export function Interfaces() {
  return (
    <div className="page">
      <h2>Intended interfaces</h2>
      <p className="lead">Where and how is the tool available, and to whom? The Companion is an addition inside Featback, not a separate app or social-media bot.</p>

      <div className="iface-diagram">
        <div className="lane">
          <div className="lane-title">User (young person, waiting for or not yet seeking treatment)</div>
          <div className="boxes">
            <div className="box primary-box">
              <b>Chat in the Featback website</b>
              <span>Browser, works on phone and desktop. No app install, low threshold. Pseudonymous Featback account.</span>
            </div>
            <div className="box">
              <b>My record</b>
              <span>View, correct, delete, download.</span>
            </div>
            <div className="box">
              <b>Privacy & consent</b>
              <span>Per-purpose toggles, "who sees what".</span>
            </div>
            <div className="box">
              <b>Optional check-in reminders</b>
              <span>Email or push, opt-in, neutral wording ("You have a new message"). Never mentions eating disorders on a lock screen.</span>
            </div>
          </div>
        </div>
        <div className="arrow">↕ only with the user's confirmation</div>
        <div className="lane">
          <div className="lane-title">Humans in the loop</div>
          <div className="boxes">
            <div className="box">
              <b>Expert-by-experience / clinician dashboard</b>
              <span>Receives hand-offs and triage summaries the user confirmed. Replies via Featback messages.</span>
            </div>
            <div className="box">
              <b>Clinical content admin</b>
              <span>Clinicians curate the versioned strategy library with sources. The AI can only rank from it.</span>
            </div>
            <div className="box">
              <b>Safety & fairness review</b>
              <span>Audit of escalations and per-subgroup metrics. Aggregated only, no raw chats.</span>
            </div>
          </div>
        </div>
        <div className="lane excluded">
          <div className="lane-title">Deliberately not connected</div>
          <div className="boxes">
            <div className="box">Parents / school</div>
            <div className="box">Employers / insurers</div>
            <div className="box">Social media / advertising</div>
            <div className="box">Researchers (only via a separate study consent)</div>
          </div>
        </div>
      </div>

      <h3>Design choices for the interface</h3>
      <ul className="bullets">
        <li><b>Quick replies plus free text.</b> Buttons lower the effort to answer the EMA-style follow-ups; free text is always possible and passes the safety check first.</li>
        <li><b>Cards for decisions.</b> Consent, extracted entries, patterns and recommendations appear as cards with explicit buttons, so the AI never acts implicitly.</li>
        <li><b>"Why am I seeing this?"</b> on every pattern and recommendation (explainability).</li>
        <li><b>Human always one tap away.</b> "Talk to a person" is on every recommendation card, not only in a crisis.</li>
        <li><b>Accessible language.</b> Short sentences, no clinical labels, no numbers about weight, calories or BMI anywhere in the interface.</li>
      </ul>
    </div>
  )
}

const METRICS: { area: string; metric: string; test: string; live: string; target: string }[] = [
  {
    area: 'Safety',
    metric: 'Harmful output rate',
    test: 'Red-team set of pro-ED prompts, jailbreaks and ambiguous requests, reviewed by clinicians',
    live: 'Random sample of conversations audited monthly; user "this was harmful" reports',
    target: '0 harmful outputs on the test set',
  },
  {
    area: 'Safety',
    metric: 'Crisis / medical escalation recall and precision',
    test: 'Labelled crisis messages, including indirect wording and Dutch slang',
    live: 'Clinician review of escalations and of missed cases found in audits',
    target: 'Recall ≥ 0.98; lower precision is acceptable',
  },
  {
    area: 'Grounding',
    metric: 'Share of advice traceable to the approved library',
    test: 'Automated check: every recommendation ID exists in the library version',
    live: 'Same check on every output (logged)',
    target: '100%',
  },
  {
    area: 'Pattern quality',
    metric: 'User recognition rate (yes / partly / no)',
    test: 'Clinicians rate sample patterns from the trial data for plausibility',
    live: 'Answers to "Do you recognise this pattern?"',
    target: 'Track over time; many "no" answers mean the rule is too loose',
  },
  {
    area: 'Usefulness',
    metric: 'Post-strategy helpfulness and uptake',
    test: 'Offline replay: does the personal ranking put strategies that helped later near the top?',
    live: '"Did it help?" ratings; % of suggestions tried',
    target: 'Personalised > default clinician order',
  },
  {
    area: 'Autonomy',
    metric: 'Perceived pushiness / respect for "no"',
    test: 'Script checks: after "no", no repeated suggestion in the same session',
    live: '"A bit pushy" feedback rate; short Likert question on feeling in control',
    target: 'Stable or decreasing pushiness reports',
  },
  {
    area: 'Privacy & consent',
    metric: 'Consent comprehension',
    test: 'Usability test: can participants explain what each toggle does?',
    live: 'Consent change rate; time to fulfil deletion and download requests',
    target: '≥ 80% correct explanations',
  },
  {
    area: 'Fairness',
    metric: 'All metrics above, per subgroup',
    test: 'Break down by gender, age band, ED type and background (trial data, if shared by the client)',
    live: 'Same breakdown on voluntary, separately consented demographics',
    target: 'Max gap between subgroups below a set threshold',
  },
  {
    area: 'Outcome',
    metric: 'ED symptoms and help-seeking',
    test: 'Compare with Featback alone, as in Rohrbach et al. (2022)',
    live: 'Standard questionnaire at intake and follow-up; uptake of treatment',
    target: 'Non-inferior to Featback alone, more help-seeking',
  },
]

const SUBGROUP = [
  { group: 'Women, 16–24', n: 412, helpful: 0.63, recall: 0.99 },
  { group: 'Men, 16–24', n: 38, helpful: 0.41, recall: 0.94 },
  { group: 'Non-binary', n: 17, helpful: null, recall: null },
  { group: 'Binge-type symptoms', n: 121, helpful: 0.52, recall: 0.98 },
  { group: 'Restrictive-type symptoms', n: 309, helpful: 0.64, recall: 0.99 },
]

export function Evaluation() {
  return (
    <div className="page">
      <h2>Evaluation metrics</h2>
      <p className="lead">
        How can we decide whether the outputs are good? Each metric has a <b>test context</b> (before release, on prepared data) and an{' '}
        <b>interaction context</b> (in use, from real feedback).
      </p>
      <div className="table-wrap">
        <table className="metrics">
          <thead>
            <tr>
              <th>Area</th>
              <th>Metric</th>
              <th>Test context</th>
              <th>Interaction context</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => (
              <tr key={m.metric}>
                <td><span className="pill">{m.area}</span></td>
                <td><b>{m.metric}</b></td>
                <td>{m.test}</td>
                <td>{m.live}</td>
                <td>{m.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Why per subgroup: illustrative example</h3>
      <p className="muted">
        Made-up numbers. An aggregate "58% helpful, recall 0.98" can hide that an underrepresented group gets worse results (Mehrabi et al., 2022).
      </p>
      <div className="table-wrap">
        <table className="metrics subgroup">
          <thead>
            <tr>
              <th>Subgroup</th>
              <th>n</th>
              <th>Strategies rated helpful</th>
              <th>Crisis recall</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {SUBGROUP.map((g) => {
              const small = g.n < 20
              const gap = !small && ((g.helpful ?? 1) < 0.5 || (g.recall ?? 1) < 0.98)
              return (
                <tr key={g.group}>
                  <td>{g.group}</td>
                  <td>{g.n}</td>
                  <td>{g.helpful === null ? '-' : `${Math.round(g.helpful * 100)}%`}</td>
                  <td>{g.recall === null ? '-' : g.recall.toFixed(2)}</td>
                  <td>
                    {small ? (
                      <span className="flag warn-flag">Too few users: no similar-user ranking, collect targeted test data</span>
                    ) : gap ? (
                      <span className="flag bad-flag">Gap: investigate before release</span>
                    ) : (
                      <span className="flag ok-flag">Within threshold</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h3>How outputs respond to user feedback</h3>
      <div className="table-wrap">
        <table className="metrics">
          <thead>
            <tr><th>User feedback</th><th>What changes</th><th>Try it in</th></tr>
          </thead>
          <tbody>
            <tr><td>"Did it help?" rating after a strategy</td><td>Order of approved strategies for that situation type</td><td>Coping suggestion and feedback</td></tr>
            <tr><td>"Do you recognise this pattern?" yes / partly / no</td><td>Pattern kept, softened, suppressed, or the feature turned off</td><td>Pattern reflection</td></tr>
            <tr><td>Correcting or deleting a record entry</td><td>Patterns and rankings are recalculated from the corrected record</td><td>Pattern reflection → My record</td></tr>
            <tr><td>"A bit pushy"</td><td>Fewer unprompted suggestions, softer wording</td><td>Coping suggestion and feedback</td></tr>
            <tr><td>Consent toggles</td><td>Which data flows exist at all</td><td>First visit, New user, Privacy tab</td></tr>
            <tr><td>Own strategy ("music helps me")</td><td>Saved privately; never recommended to others</td><td>Coping suggestion → "None of these"</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DesignBasis() {
  const cycle = ['Experience', 'Interpretation', 'Pattern recognition', 'Recommendation', 'Feedback', 'Adaptation']
  return (
    <div className="page">
      <h2>Design basis</h2>
      <p className="lead">
        A chatbot inside Featback that supports young people with eating-disorder symptoms while they wait for treatment. It supports them and
        does not replace treatment: no diagnosis, no clinical decisions.
      </p>

      <h3>The personalisation cycle</h3>
      <div className="cycle">
        {cycle.map((c, i) => (
          <div key={c} className="cycle-step">
            <span className="cycle-n">{i + 1}</span>
            {c}
            {i < cycle.length - 1 && <span className="cycle-arrow">→</span>}
          </div>
        ))}
        <div className="cycle-loop">↺ back to 1</div>
      </div>

      <h3>Requirements from Value Sensitive Design</h3>
      <div className="req-grid">
        <div className="req">
          <span className="tag tag-privacy">Privacy</span>
          <p>Purpose limitation (Contextual Integrity). The longitudinal record is visible, correctable and deletable. Similar-user use is a secondary use and needs its own consent.</p>
        </div>
        <div className="req">
          <span className="tag tag-autonomy">Autonomy</span>
          <p>The AI may narrow the list of approved actions and suggest one, but it never acts on the user's behalf. The final decision stays with the user (anti-paternalism).</p>
        </div>
        <div className="req">
          <span className="tag tag-safety">Safety</span>
          <p>Only clinically approved recommendations and reliable, traceable sources. Pro-ED and weight-loss content is blocked. Humans take over beyond safe limits.</p>
        </div>
        <div className="req">
          <span className="tag tag-fairness">Fairness</span>
          <p>Evaluate per subgroup, not in aggregate. Do not use similar-user data for groups that are too small.</p>
        </div>
      </div>

      <h3>Constraints</h3>
      <ul className="bullets">
        <li>Special-category health data under GDPR Art. 9 requires explicit, specific consent.</li>
        <li>Evidence for adaptive, personalised mental-health interventions is still limited (van Genugten et al., 2025), so only modest personalisation is justified. The demo uses simple, explainable rules instead of a black-box model.</li>
      </ul>

      <h3>Open questions</h3>
      <ul className="bullets">
        <li>What exactly makes two users "similar"?</li>
        <li>Where does a supportive suggestion become persuasive or paternalistic (beneficence vs. non-maleficence)?</li>
        <li>How noisy is self-reported ED data, and how often would a wrong pattern push behaviour in the wrong direction?</li>
      </ul>

      <p className="muted small">
        Static demo for 5ARF0 Ethics of AI (TU/e), Group EE. No real AI, no data leaves your browser. The strategy library, similar-user statistics and
        subgroup numbers are illustrative.
      </p>
    </div>
  )
}
