import { CATEGORY_LABEL, type Category, type Entry, type PersonaState, type Rating } from '../store'
import { MIN_GROUP, SIMILAR_USERS, STRATEGIES, type Strategy } from '../data/strategies'

// ---------- Pattern recognition (transparent rule, not a black box) ----------

export const PATTERN_RULE = {
  minReports: 3,
  minDifference: 1.5,
}

export interface Pattern {
  id: string
  category: Category
  evidence: Entry[]
  avg: number
  baseline: number
  text: string
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const strength = (e: Entry) => (e.impulse === 'none' ? 0 : e.intensity)

export function detectPatterns(entries: Entry[]): Pattern[] {
  const out: Pattern[] = []
  for (const cat of Object.keys(CATEGORY_LABEL) as Category[]) {
    const inCat = entries.filter((e) => e.category === cat)
    const others = entries.filter((e) => e.category !== cat)
    if (inCat.length < PATTERN_RULE.minReports) continue
    const avg = mean(inCat.map(strength))
    const baseline = mean(others.map(strength))
    if (avg - baseline < PATTERN_RULE.minDifference) continue
    out.push({
      id: `pattern:${cat}`,
      category: cat,
      evidence: inCat,
      avg,
      baseline,
      text: `${CATEGORY_LABEL[cat]}-related situations were followed by stronger impulses in ${inCat.length} of your recent reports.`,
    })
  }
  return out
}

// ---------- Recommendation ranking (only reorders clinician-approved strategies) ----------

export type Basis = 'personal' | 'similar' | 'default'

export interface Ranked {
  strategy: Strategy
  score: number
  basis: Basis
  detail: string
}

const ratingScore = (r: Rating) => (r === 'yes' ? 1 : r === 'somewhat' ? 0.5 : 0)

// Only feedback from the same type of situation counts ("what helped you in similar moments").
export function personalRatings(entries: Entry[], category: Category) {
  const map: Record<string, Rating[]> = {}
  for (const e of entries) if (e.category === category && e.strategyId && e.helpful) (map[e.strategyId] ??= []).push(e.helpful)
  return map
}

export function rankStrategies(category: Category, s: PersonaState): Ranked[] {
  const personal = s.consent.record ? personalRatings(s.entries, category) : {}
  const applicable = STRATEGIES.filter((st) => st.categories.includes(category))
  return applicable
    .map((strategy, i): Ranked => {
      const p = personal[strategy.id]
      if (p?.length) {
        const count = (r: Rating) => p.filter((x) => x === r).length
        const parts = [
          count('yes') && `helped ×${count('yes')}`,
          count('somewhat') && `a little ×${count('somewhat')}`,
          count('no') && `didn't help ×${count('no')}`,
        ].filter(Boolean)
        return {
          strategy,
          score: 0.4 + 0.6 * mean(p.map(ratingScore)),
          basis: 'personal',
          detail: `you rated it ${parts.join(', ')} in similar moments`,
        }
      }
      const sim = SIMILAR_USERS[category]?.[strategy.id]
      if (s.consent.similar && sim && sim.n >= MIN_GROUP) {
        return {
          strategy,
          score: 0.2 + 0.5 * sim.rate,
          basis: 'similar',
          detail: `Helped ${Math.round(sim.rate * 100)}% of ${sim.n} people with similar reports`,
        }
      }
      return { strategy, score: 0.45 - i * 0.01, basis: 'default', detail: 'Clinician default order' }
    })
    .sort((a, b) => b.score - a.score)
}

// ---------- Safety guardrail (rule-based stand-in for a safety classifier) ----------

export type SafetyClass = 'crisis' | 'medical' | 'harmful-request' | 'ok'

const RULES: [SafetyClass, RegExp][] = [
  ['crisis', /(suicid|kill myself|end(ing)? it|end my life|hurt myself|self[- ]?harm|don'?t want to (live|be here)|no point)/i],
  ['medical', /(faint|dizz|pass(ed)? out|chest pain|heart (is )?rac|palpitat|vomit(ing)? blood|haven'?t eaten (in|for) (days|\d))/i],
  ['harmful-request', /(calori|lose weight|losing weight|weight loss|diet plan|\bdiet\b|fasting|\bfast\b|skip meals|purg|laxativ|thinspo|how (to|can i) eat less|burn off|kg fast|appetite suppress)/i],
]

export function classify(text: string): SafetyClass {
  for (const [cls, re] of RULES) if (re.test(text)) return cls
  return 'ok'
}
