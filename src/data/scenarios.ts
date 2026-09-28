import type { Api, Category, PersonaId, PersonaState } from '../store'
import { CATEGORY_LABEL } from '../store'
import { strategyById } from './strategies'
import { detectPatterns } from '../logic/engine'

export type Tag =
  | 'Autonomy'
  | 'Privacy'
  | 'Consent'
  | 'Safety'
  | 'Fairness'
  | 'Explainability'
  | 'Human oversight'
  | 'Beneficence'
  | 'Non-maleficence'
  | 'Feedback loop'

export interface Note {
  tag: Tag
  text: string
}

export interface BotMsg {
  text: string
  source?: string
  tone?: 'alert'
}

export type WidgetId =
  | 'consent'
  | 'entryReview'
  | 'pattern'
  | 'recommendations'
  | 'similarConsent'
  | 'crisis'
  | 'medical'
  | 'clinicianView'
  | 'recordSummary'
  | 'deleteConfirm'

export interface Reply {
  label: string
  to: string
  say?: string
  effect?: (api: Api) => void
}

export interface ChatNode {
  bot?: (string | BotMsg)[] | ((s: PersonaState) => (string | BotMsg)[])
  widget?: WidgetId
  widgetProps?: Record<string, unknown>
  replies?: Reply[] | ((s: PersonaState) => Reply[])
  freeText?: boolean
  end?: boolean
  notes?: Note[]
}

export interface Scenario {
  id: string
  title: string
  short: string
  persona: PersonaId
  goal: string
  start: string
  nodes: Record<string, ChatNode>
}

const patchDraft = (patch: Record<string, unknown>) => (api: Api) =>
  api.set((s) => ({ ...s, draft: { ...s.draft, ...patch } }))

// ------------------------------------------------------------------
// 1. Onboarding & layered consent
// ------------------------------------------------------------------
const onboarding: Scenario = {
  id: 'onboarding',
  title: 'First visit and consent',
  short: 'Setting expectations, then consent per purpose',
  persona: 'noor',
  goal: 'Show that consent is explicit and specific to each purpose (GDPR Art. 9) instead of one checkbox, and that the chatbot is honest about its limits.',
  start: 'n1',
  nodes: {
    n1: {
      bot: [
        "Hi, I'm the Featback Companion, a chatbot inside Featback. Before we start, here is what I am and what I'm not.",
        "I'm not a therapist and I can't diagnose anything. I can share information and coping strategies that clinicians have approved, and help you notice things in your own reports.",
        "If things get too heavy, I'll help you reach a real person: a Featback expert-by-experience, your GP, or a crisis line.",
      ],
      replies: [
        { label: 'What happens with what I tell you?', to: 'n2' },
        { label: 'Can I just chat without anything being saved?', to: 'n2b' },
      ],
      notes: [
        { tag: 'Non-maleficence', text: 'Scope is set up front: supportive tool, not a replacement for treatment or a diagnostic system.' },
        { tag: 'Human oversight', text: 'The route to a human is introduced before it is needed.' },
      ],
    },
    n2: {
      bot: ['Good question. You decide, separately for each purpose. Everything is off until you switch it on.'],
      widget: 'consent',
      notes: [
        { tag: 'Consent', text: 'Explicit, specific consent per purpose (GDPR Art. 9(2)(a)). All defaults are off.' },
        { tag: 'Privacy', text: 'Contextual Integrity: each data flow (record, patterns, similar users, clinician) is a separate context with its own norms.' },
      ],
    },
    n2b: {
      bot: [
        "Yes. With 'Keep a personal record' off, our conversation is not stored after you close the chat.",
        "You'll still get general, clinician-approved strategies, just not personalised ones. You can change your mind later.",
      ],
      widget: 'consent',
      notes: [
        { tag: 'Autonomy', text: 'Using the tool without personalisation is a real option, not a degraded dark pattern.' },
        { tag: 'Consent', text: 'Consent is not a condition for access to basic support.' },
      ],
    },
    n3: {
      bot: (s) => {
        const on = Object.entries(s.consent).filter(([, v]) => v).length
        return [
          on === 0
            ? "Got it: nothing will be stored. We can still talk, and I'll offer general strategies."
            : `Saved. You turned on ${on} of 5 options. You can review this any time under Privacy.`,
          "One more promise: before I use your information for anything new, I'll ask you first, in the moment.",
        ]
      },
      replies: [{ label: 'Okay, sounds good', to: 'end' }],
      notes: [{ tag: 'Consent', text: 'Ongoing consent loop: consent is asked again at the moment of a new use, not only at registration.' }],
    },
    end: {
      bot: ['Whenever you want to talk about a difficult moment, I am here.'],
      end: true,
    },
  },
}

// ------------------------------------------------------------------
// 2. Check-in conversation (EMA-style)
// ------------------------------------------------------------------
const checkin: Scenario = {
  id: 'checkin',
  title: 'Check-in after a hard moment',
  short: 'Follow-up questions build the longitudinal record',
  persona: 'sam',
  goal: 'Show how short, EMA-style follow-up questions (situation, emotion, urge, action) produce a structured entry that the user checks before it is saved.',
  start: 'n1',
  nodes: {
    n1: {
      bot: ['Hi Sam, welcome back. How are you doing today?'],
      replies: [{ label: 'Not great. Something happened in the changing room at the gym.', to: 'n2' }],
      notes: [{ tag: 'Beneficence', text: 'Low-threshold, open start. The user sets the topic.' }],
    },
    n2: {
      bot: ["I'm sorry, that sounds hard. Would you like to tell me more about what happened? You can skip any question."],
      replies: [
        {
          label: 'Someone commented on my body and I kept comparing myself to others.',
          to: 'n3',
          effect: patchDraft({ situation: 'Comment about my body in the gym changing room', category: 'body-image' }),
        },
        { label: "I'd rather not go into it.", to: 'n3', effect: patchDraft({ situation: '(not described)', category: 'other' }) },
      ],
      notes: [{ tag: 'Autonomy', text: 'Every question can be skipped, so the user controls how much they disclose.' }],
    },
    n3: {
      bot: ['Thank you for sharing that. How did you feel afterwards?'],
      replies: [
        { label: 'Ashamed and anxious', to: 'n4', effect: patchDraft({ emotions: ['ashamed', 'anxious'] }) },
        { label: 'Mostly angry at myself', to: 'n4', effect: patchDraft({ emotions: ['angry at myself'] }) },
        { label: 'Skip', to: 'n4', effect: patchDraft({ emotions: [] }) },
      ],
      notes: [{ tag: 'Explainability', text: 'EMA (Schaefer et al., 2020): collecting emotion close to the moment captures shifts that later questionnaires miss.' }],
    },
    n4: {
      bot: ['Did you notice any urge around eating afterwards?'],
      replies: [
        { label: 'I wanted to skip dinner', to: 'n5', effect: patchDraft({ impulse: 'restrict' }) },
        { label: 'I wanted to eat a lot at once', to: 'n5', effect: patchDraft({ impulse: 'binge' }) },
        { label: 'No urge', to: 'n6', effect: patchDraft({ impulse: 'none', intensity: 1 }) },
      ],
    },
    n5: {
      bot: ['How strong was the urge, from 1 (barely) to 5 (very strong)?'],
      replies: [1, 2, 3, 4, 5].map((n) => ({ label: String(n), to: 'n6', effect: patchDraft({ intensity: n }) })),
    },
    n6: {
      bot: ["What did you do, if anything? 'Nothing' is a fine answer too."],
      replies: [
        { label: 'I skipped dinner', to: 'n7', effect: patchDraft({ action: 'Skipped dinner' }) },
        { label: 'I ate dinner but felt bad', to: 'n7', effect: patchDraft({ action: 'Ate dinner, felt bad' }) },
        { label: 'I went for a walk and called a friend', to: 'n7', effect: patchDraft({ action: 'Walk + called a friend' }) },
      ],
      notes: [{ tag: 'Non-maleficence', text: 'Neutral, non-judgemental wording. No praise or blame for eating behaviour.' }],
    },
    n7: {
      bot: ["Thanks. Here's what I would save to your record. You can change it, or choose not to save it."],
      widget: 'entryReview',
      notes: [
        { tag: 'Privacy', text: 'The AI shows exactly what it extracted from the conversation. Nothing is stored silently.' },
        { tag: 'Autonomy', text: 'The user corrects the interpretation, for example the category, before it enters the record.' },
      ],
    },
    n8: {
      bot: (s) => {
        const p = detectPatterns(s.entries)
        return [
          s.consent.record ? 'Saved. You can find it under My record at any time.' : "Okay, it's not saved.",
          ...(p.length && s.consent.patterns
            ? ['I noticed something in your recent reports that might be worth looking at together. No pressure. See the use case "Pattern reflection".']
            : []),
        ]
      },
      end: true,
      notes: [{ tag: 'Feedback loop', text: 'Cycle step: experience, then the user confirms the interpretation, then it is stored as a record entry.' }],
    },
  },
}

// ------------------------------------------------------------------
// 3. Pattern reflection
// ------------------------------------------------------------------
const pattern: Scenario = {
  id: 'pattern',
  title: 'Pattern reflection',
  short: 'The AI asks whether a possible pattern fits; it does not assert it',
  persona: 'sam',
  goal: 'Show the core addition from the draft: the AI proposes a possible pattern as a question, explains the evidence, and the user keeps final authority over the interpretation.',
  start: 'n1',
  nodes: {
    n1: {
      bot: ["Hi Sam. Before anything else: I noticed something in your recent reports. I'm only mentioning it because you turned on pattern suggestions. Would you like to see it?"],
      replies: [
        { label: 'Yes, show me', to: 'n2' },
        {
          label: 'Not now',
          to: 'later',
          effect: (api) => {
            api.set((s) => ({ ...s, patternStatus: { ...s.patternStatus, 'pattern:body-image': 'snoozed' } }))
            api.log('Pattern snoozed: will not be raised again for 14 days.')
          },
        },
      ],
      notes: [
        { tag: 'Consent', text: 'Pattern suggestions only run when the user has enabled that specific purpose.' },
        { tag: 'Autonomy', text: 'The user can decline to even look at the pattern.' },
      ],
    },
    later: { bot: ["Of course. I won't bring it up for two weeks. You can always ask me about it yourself."], end: true },
    n2: {
      widget: 'pattern',
      notes: [
        { tag: 'Explainability', text: 'The pattern shows its evidence (which reports) and the exact rule that triggered it.' },
        { tag: 'Non-maleficence', text: 'Worded as an association in the user\'s own reports, not a cause or a diagnosis (Schaefer et al., 2020).' },
        { tag: 'Autonomy', text: '"Do you recognise this pattern?" The user, not the AI, has final authority over the interpretation.' },
      ],
    },
    yes: {
      bot: [
        "Thanks for confirming. That's your insight, not mine.",
        'Would it help if I offer a strategy next time you log a body-image situation, or would you rather ask for one yourself?',
      ],
      replies: [
        {
          label: 'Yes, offer one',
          to: 'end',
          effect: (api) => {
            api.set((s) => ({ ...s, prefs: { ...s.prefs, proactive: true } }))
            api.log('User opted in: strategies offered proactively after body-image reports.')
          },
        },
        {
          label: 'Only when I ask',
          to: 'end',
          effect: (api) => {
            api.set((s) => ({ ...s, prefs: { ...s.prefs, proactive: false } }))
            api.log('User prefers to ask: no unprompted strategy suggestions.')
          },
        },
      ],
      notes: [{ tag: 'Autonomy', text: 'Even a confirmed pattern does not automatically change behaviour. The user chooses how it is used (anti-paternalism, Kühler 2022).' }],
    },
    partly: {
      bot: ['Thanks, that nuance helps. Which part fits least?'],
      replies: [
        {
          label: 'The urges are not always about food',
          to: 'end',
          effect: (api) => api.log('Pattern marked "partly": wording adjusted; kept as a tentative note, not used for ranking.'),
        },
        {
          label: "It only happens with certain people's comments",
          to: 'end',
          effect: (api) => api.log('Pattern marked "partly": user context added. Only used when user refers to comments from others.'),
        },
      ],
    },
    no: {
      bot: ['Thanks for telling me. You know your own experience best. What does not fit?'],
      replies: [
        {
          label: 'Those situations were really different',
          to: 'end',
          effect: (api) => api.log('Pattern dismissed. Not shown again unless 3 new matching reports arrive.'),
        },
        {
          label: "I don't want pattern suggestions at all",
          to: 'end',
          effect: (api) => {
            api.set((s) => ({ ...s, consent: { ...s.consent, patterns: false } }))
            api.log('Consent withdrawn: pattern recognition switched off for this user.')
          },
        },
      ],
      notes: [{ tag: 'Feedback loop', text: 'A rejection changes behaviour: the pattern is suppressed, or the whole feature is switched off.' }],
    },
    fix: {
      bot: [
        'You can correct or delete entries under My record (tab above). Patterns are recalculated only from what is there.',
        'Try it: delete or recategorise a few body-image reports, then come back.',
      ],
      replies: [{ label: "I've made changes, check again", to: 'n2' }],
      notes: [
        { tag: 'Privacy', text: 'The longitudinal record is visible, correctable and deletable. Derived patterns follow the record.' },
      ],
    },
    end: { bot: ['Thanks for thinking this through with me.'], end: true },
  },
}

// ------------------------------------------------------------------
// 4. Personalised coping suggestion + feedback loop
// ------------------------------------------------------------------
const coping: Scenario = {
  id: 'coping',
  title: 'Coping suggestion and feedback',
  short: 'Ranked approved strategies, then feedback changes the ranking',
  persona: 'sam',
  goal: 'Show the full cycle: situation, recommendation from the approved library, the user chooses, feedback, adaptation. The AI only narrows and orders, the user decides.',
  start: 'n1',
  nodes: {
    n1: {
      bot: ['Hi Sam. How are you right now?'],
      replies: [
        {
          label: 'I just tried on clothes and I feel awful about my body. I want to skip lunch.',
          to: 'n2',
          effect: patchDraft({ situation: 'Trying on clothes at home', category: 'body-image', emotions: ['awful'], impulse: 'restrict', intensity: 4 }),
        },
      ],
    },
    n2: {
      bot: (s) => [
        'That sounds really hard. Thank you for telling me instead of carrying it alone.',
        s.prefs.tone === 'gentle'
          ? 'If you ever want some ideas, just say so. Would you like that now?'
          : 'Some strategies helped you in similar moments before. Would you like me to suggest a few? You decide whether to try any.',
      ],
      replies: [
        { label: 'Yes, show me', to: 'n3' },
        { label: 'No, I just want to vent', to: 'vent' },
      ],
      notes: [{ tag: 'Autonomy', text: 'Asks before recommending. Suggestions are offers, not instructions.' }],
    },
    vent: {
      bot: ["Of course. I'm listening, and I won't suggest anything unless you ask."],
      end: true,
      notes: [{ tag: 'Autonomy', text: 'Declining is respected without a second nudge (persuasive-technology boundary).' }],
    },
    n3: {
      widget: 'recommendations',
      widgetProps: { category: 'body-image', pickTo: 'n4', noneTo: 'none', personTo: 'person' },
      notes: [
        { tag: 'Safety', text: 'Only strategies from the clinician-approved library, each with a traceable source.' },
        { tag: 'Explainability', text: 'Each suggestion shows why it is ranked there: your feedback, similar users, or default order.' },
        { tag: 'Autonomy', text: 'The AI narrows the list and suggests; it never acts on the user\'s behalf.' },
      ],
    },
    person: {
      bot: ['Sure. I can open a chat with a Featback expert-by-experience. They usually reply within a day. Want me to open it?'],
      replies: [{ label: 'Yes please', to: 'end' }, { label: 'Maybe later', to: 'end' }],
      notes: [{ tag: 'Human oversight', text: 'A human is always one tap away, not only in a crisis.' }],
    },
    none: {
      bot: ["That's okay. Is there something you already do that helps you?"],
      replies: [
        {
          label: 'Listening to loud music helps me',
          to: 'own',
          effect: (api) => {
            api.set((s) => ({ ...s, customStrategies: [...s.customStrategies, 'Listening to loud music'] }))
            api.log('Own strategy saved privately: "Listening to loud music". Not shared with others.')
          },
        },
      ],
    },
    own: {
      bot: [
        "Nice, I've saved 'listening to loud music' as your own strategy, and I can remind you of it.",
        "I won't recommend it to anyone else. Only clinician-approved strategies are ever suggested to other people.",
      ],
      end: true,
      notes: [{ tag: 'Safety', text: 'User-entered strategies never become recommendations for others, which blocks harmful tips from spreading between users.' }],
    },
    n4: {
      bot: (s) => [
        `Okay: "${strategyById(s.draft.strategyId ?? '')?.title}". Take your time.`,
        'Shall I check in with you in 20 minutes?',
      ],
      replies: [
        { label: 'Sure', to: 'n5' },
        { label: 'No reminder, thanks', to: 'n5' },
      ],
    },
    n5: {
      bot: (s) => [`(20 minutes later) Hi again. Did "${strategyById(s.draft.strategyId ?? '')?.title}" help?`],
      replies: (['yes', 'somewhat', 'no'] as const).map((r) => ({
        label: r === 'yes' ? 'It helped' : r === 'somewhat' ? 'A little' : "It didn't help",
        to: 'n6',
        effect: (api: Api) => {
          const d = api.s.draft
          const title = strategyById(d.strategyId ?? '')?.title
          if (!api.s.consent.record) {
            api.log(`Feedback on "${title}" used for this session only (record is off).`)
            return
          }
          api.set((s) => ({
            ...s,
            entries: [
              ...s.entries,
              {
                id: `e${Date.now()}`,
                date: '2026-09-28',
                situation: d.situation ?? '',
                category: (d.category ?? 'body-image') as Category,
                emotions: d.emotions ?? [],
                impulse: d.impulse ?? 'restrict',
                intensity: d.intensity ?? 3,
                action: `Tried: ${title}`,
                strategyId: d.strategyId,
                helpful: r,
              },
            ],
          }))
          api.log(`Feedback "${r}" on "${title}" stored, so ranking for body-image situations was updated.`)
        },
      })),
      notes: [{ tag: 'Feedback loop', text: 'Feedback after trying a strategy becomes new information for future recommendations.' }],
    },
    n6: {
      bot: ["Thanks. I've updated how I order strategies for you. This only changes the order of approved strategies; it never adds new ones."],
      widget: 'recommendations',
      widgetProps: { category: 'body-image', compare: true },
      replies: [
        { label: 'Good to know', to: 'tone' },
      ],
      notes: [{ tag: 'Explainability', text: 'Arrows show exactly how the user\'s feedback moved each strategy.' }],
    },
    tone: {
      bot: ['Last question: how did it feel to get suggestions from me today?'],
      replies: [
        { label: 'Helpful', to: 'end', effect: (api) => api.log('Tone feedback: helpful. No change.') },
        {
          label: 'A bit pushy',
          to: 'end',
          effect: (api) => {
            api.set((s) => ({ ...s, prefs: { ...s.prefs, tone: 'gentle', proactive: false } }))
            api.log('Tone feedback "pushy": fewer unprompted suggestions and softer wording from now on.')
          },
        },
      ],
      notes: [{ tag: 'Autonomy', text: 'The user can give feedback on how the AI communicates, not just on what it suggests. This guards the boundary between support and persuasion.' }],
    },
    end: { bot: ["Thanks, Sam. I'm here when you need me."], end: true },
  },
}

// ------------------------------------------------------------------
// 5. New user: cold start with similar-user data (just-in-time consent)
// ------------------------------------------------------------------
const coldstart: Scenario = {
  id: 'coldstart',
  title: 'New user: help from similar users',
  short: 'Consent asked at the moment of a secondary use',
  persona: 'noor',
  goal: 'Show how a new user with no history can benefit from aggregated feedback of similar users, and why that secondary use needs its own consent (Contextual Integrity).',
  start: 'n1',
  nodes: {
    n1: {
      bot: [
        'Hi Noor. You just described a family dinner where you felt everyone was watching what you ate. That sounds stressful.',
        "Since you're new, I don't know yet what works for you. I could use anonymous feedback from other Featback users with similar reports to put the approved strategies in a more useful order.",
        'That is a new use of data, so I will ask first.',
      ],
      widget: 'similarConsent',
      notes: [
        { tag: 'Consent', text: 'Just-in-time consent: asked at the moment the purpose arises, with plain-language detail.' },
        { tag: 'Privacy', text: "Two separate flows: using others' data for Noor, and Noor's data helping others. Each is consented separately." },
      ],
    },
    n2: {
      widget: 'recommendations',
      widgetProps: { category: 'social-eating', pickTo: 'n3', noneTo: 'n3', personTo: 'n3' },
      notes: [
        { tag: 'Fairness', text: 'Similar users are matched on situation type and urge strength only, not demographics. Groups smaller than 20 are never used.' },
        { tag: 'Safety', text: "Similarity only changes the order of approved strategies. Other users' own tips are never passed on." },
        { tag: 'Explainability', text: 'Compare with/without consent: the reason label changes from "default order" to "similar users".' },
      ],
    },
    n3: {
      bot: [
        "Thanks, Noor. As you use the Companion more, your own feedback will count more than other people's.",
        'Open design question for our team: what exactly makes two users "similar"? We still need to investigate this.',
      ],
      end: true,
      notes: [{ tag: 'Fairness', text: 'Similar-user performance must be evaluated per subgroup (Mehrabi et al., 2022); see the Evaluation tab.' }],
    },
  },
}

// ------------------------------------------------------------------
// 6. Safety: harmful requests, medical risk, crisis
// ------------------------------------------------------------------
const safety: Scenario = {
  id: 'safety',
  title: 'Safety and human hand-off',
  short: 'Harmful requests, medical risk, crisis escalation',
  persona: 'sam',
  goal: 'Show the guardrails: the AI declines pro-ED requests, recognises medical and crisis risk, and hands over to humans, sharing information only with consent.',
  start: 'n1',
  nodes: {
    n1: {
      bot: ["Hi Sam, what's on your mind? (Pick a message, or type your own to test the safety check.)"],
      replies: [
        { label: 'Can you give me a diet plan to lose 5 kg fast?', to: 'harm' },
        { label: "I've been dizzy and I fainted after not eating for two days.", to: 'medical' },
        { label: "I don't see the point anymore. Sometimes I think about ending it.", to: 'crisis' },
      ],
      freeText: true,
      notes: [{ tag: 'Safety', text: 'Every message passes a safety check before any other logic. Try typing your own message.' }],
    },
    harm: {
      bot: [
        {
          text: "I can't help with weight-loss plans or calorie targets. For people dealing with eating difficulties, that kind of advice can make things worse, even when it's asked for sincerely.",
        },
        {
          text: 'What I can do is explain why regular eating often reduces urges and low moods, or connect you with an expert-by-experience who has been through this.',
          source: 'Regular eating, CBT-E (Fairburn, 2008)',
        },
      ],
      replies: [
        { label: 'Tell me about regular eating', to: 'regular' },
        { label: 'Connect me with someone', to: 'notify' },
      ],
      notes: [
        { tag: 'Non-maleficence', text: 'Generative models have been shown to reinforce ED behaviours and implicitly favour weight loss (Yim et al., 2026). Such requests are declined.' },
        { tag: 'Explainability', text: 'The refusal explains why, without moralising, and offers a safe alternative.' },
      ],
    },
    regular: {
      bot: [
        {
          text: 'Eating at regular moments (for example three meals and two or three snacks a day) keeps your body and mood more stable. Long gaps often make urges to binge, or to restrict even more, stronger later on.',
          source: 'Regular eating, CBT-E (Fairburn, 2008) · Featback psychoeducation',
        },
        "It's not about numbers or rules for what to eat. Would you like me to share this again the next time you log a hard moment?",
      ],
      replies: [
        { label: 'Yes', to: 'end', effect: (api) => api.log('User asked to be reminded about regular eating after hard moments.') },
        { label: 'No thanks', to: 'end' },
      ],
      notes: [{ tag: 'Safety', text: 'Information comes from approved psychoeducation with a visible source. No calorie or weight numbers.' }],
    },
    medical: {
      bot: [{ text: 'What you describe can be medically serious. Please contact your GP (huisarts) today.', tone: 'alert' }],
      widget: 'medical',
      replies: [
        { label: 'Let my expert-by-experience know', to: 'notify' },
        { label: "I'll call my GP myself", to: 'end' },
      ],
      notes: [
        { tag: 'Safety', text: 'Physical warning signs lead to medical advice first. The chatbot does not assess severity itself.' },
        { tag: 'Human oversight', text: 'Situations beyond what the chatbot can safely handle go to humans.' },
      ],
    },
    crisis: {
      bot: [
        { text: "Thank you for telling me, Sam. I'm really glad you did.", tone: 'alert' },
        { text: "I'm a chatbot, and this is something a person should help you with right now.", tone: 'alert' },
      ],
      widget: 'crisis',
      replies: [
        { label: "I'll contact 113", to: 'stay' },
        { label: 'Let my expert-by-experience know', to: 'notify' },
      ],
      notes: [
        { tag: 'Safety', text: 'Crisis detection is tuned for high recall: a false alarm is far less costly than a missed crisis.' },
        { tag: 'Human oversight', text: 'Normal features (patterns, suggestions) pause. Only crisis resources are shown.' },
      ],
    },
    stay: {
      bot: ["That's a brave step. I'll keep this chat open. If you want, tell me when you've reached them."],
      end: true,
    },
    notify: {
      bot: ['Here is exactly what would be shared. Nothing is sent until you confirm.'],
      widget: 'clinicianView',
      notes: [
        { tag: 'Privacy', text: 'Contextual Integrity: only a minimal summary goes to the care context. The full chat is shared only if Sam chooses. Parents, schools and researchers never receive it.' },
        { tag: 'Human oversight', text: 'Clinicians and expert patients get triage information, and the organisation remains responsible for people who deteriorate while waiting.' },
      ],
    },
    sent: {
      bot: ["Sent. Your expert-by-experience usually replies within a day, in Featback's messages. If things get worse before then, 113 is there 24/7."],
      end: true,
      notes: [{ tag: 'Human oversight', text: 'Hand-off is logged for clinical audit, so the organisation can follow up.' }],
    },
    ok: {
      bot: ['Thanks for sharing that. Would you like to do a short check-in about it, or just talk?'],
      end: true,
      notes: [{ tag: 'Safety', text: 'Classified as safe, so the conversation continues in the normal support flow.' }],
    },
    end: { bot: ["I'm here whenever you want to talk again."], end: true },
  },
}

// ------------------------------------------------------------------
// 7. Data rights: see, correct, delete
// ------------------------------------------------------------------
const data: Scenario = {
  id: 'data',
  title: 'What do you know about me?',
  short: 'See, correct, download and delete the record',
  persona: 'sam',
  goal: 'Show that the longitudinal record is visible, correctable and deletable, and that everything derived from it (patterns, rankings) follows.',
  start: 'n1',
  nodes: {
    n1: {
      bot: ['You asked what I know about you. Here it is in one place.'],
      widget: 'recordSummary',
      replies: [
        { label: 'Why do you keep this?', to: 'why' },
        { label: 'Delete everything', to: 'del' },
      ],
      notes: [
        { tag: 'Privacy', text: 'Right of access, rectification, erasure and portability (GDPR Art. 15-17, 20) in plain language, inside the chat.' },
        { tag: 'Explainability', text: 'Shows what is derived from the data, not just the raw data.' },
      ],
    },
    why: {
      bot: (s) => [
        'Only to personalise your support: noticing possible patterns and ordering strategies by what helped you.',
        `It is not used for advertising, not sold, and not shared with parents, school or employers. ${s.consent.contribute ? 'Your anonymous ratings help order strategies for similar users, because you allowed that.' : 'It does not help other users, because you have not allowed that.'}`,
      ],
      replies: [{ label: 'Delete everything', to: 'del' }, { label: 'Okay, keep it', to: 'end' }],
      notes: [{ tag: 'Privacy', text: 'Purpose limitation: each use is named explicitly.' }],
    },
    del: {
      bot: ['Are you sure? This removes all reports, patterns and your own strategies. It cannot be undone.'],
      widget: 'deleteConfirm',
    },
    deleted: {
      bot: [
        'Done. Your record and everything derived from it has been deleted. Your ratings are also removed from future similar-user statistics.',
        'You can keep using the Companion; suggestions will start from the default clinician order again.',
      ],
      end: true,
      notes: [{ tag: 'Feedback loop', text: 'Check the other use cases now: the pattern disappears and rankings fall back to default.' }],
    },
    end: { bot: ["Okay. You can change this any time under Privacy or My record."], end: true },
  },
}

export const SCENARIOS: Scenario[] = [onboarding, checkin, pattern, coping, coldstart, safety, data]

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL) as [Category, string][]
