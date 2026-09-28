import type { Category } from '../store'

export interface Strategy {
  id: string
  title: string
  description: string
  categories: Category[]
  basis: string
}

// Clinician-approved library (mock). The AI may only rank these; it never writes new ones.
export const LIBRARY_VERSION = 'Approved strategy library v0.3 (mock, reviewed by clinical team)'

export const STRATEGIES: Strategy[] = [
  {
    id: 's1',
    title: 'Urge surfing',
    description: 'Notice the urge without acting on it. Set a 10-minute timer and observe how it rises and falls, like a wave.',
    categories: ['body-image', 'social-eating', 'stress', 'other'],
    basis: 'Distress tolerance skills (DBT, Linehan)',
  },
  {
    id: 's2',
    title: 'Reach out to someone you trust',
    description: 'Send a message to a friend, family member or your Featback expert-by-experience. You do not have to explain everything.',
    categories: ['body-image', 'social-eating', 'stress', 'other'],
    basis: 'Social support, Featback expert-patient module',
  },
  {
    id: 's3',
    title: 'Plan your next regular meal',
    description: 'Decide when your next meal or snack will be and keep that plan, even if you do not feel like it. Regular eating reduces the urge to restrict or binge later.',
    categories: ['body-image', 'social-eating', 'stress'],
    basis: 'Regular eating, CBT-E (Fairburn, 2008)',
  },
  {
    id: 's4',
    title: 'Focus on what your body does',
    description: 'Write down three things your body let you do today (walk, hug someone, laugh). Shift attention from appearance to function.',
    categories: ['body-image'],
    basis: 'Body-image psychoeducation, CBT-E',
  },
  {
    id: 's5',
    title: '5-4-3-2-1 grounding',
    description: 'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell and 1 you taste. It brings you back to the present moment.',
    categories: ['body-image', 'social-eating', 'stress'],
    basis: 'Grounding / emotion regulation',
  },
  {
    id: 's6',
    title: 'Write the thought, then a kinder one',
    description: 'Write down the thought that is bothering you, then write what you would say to a friend who had that thought.',
    categories: ['body-image', 'social-eating', 'stress', 'other'],
    basis: 'Thought record, CBT',
  },
  {
    id: 's7',
    title: 'Pause body checking',
    description: 'Agree with yourself to not check mirrors, the scale or photos for the rest of today. Checking tends to keep worries going.',
    categories: ['body-image'],
    basis: 'Body checking reduction, CBT-E',
  },
  {
    id: 's8',
    title: 'Do something kind and absorbing',
    description: 'Pick an activity that takes your attention: music, a game, a walk with a friend, a shower. Aim for 20 minutes.',
    categories: ['stress', 'other'],
    basis: 'Behavioural activation',
  },
]

export const strategyById = (id: string) => STRATEGIES.find((s) => s.id === id)

// Aggregated feedback from other users (mock). Only groups with n >= MIN_GROUP are ever used.
export const MIN_GROUP = 20

export const SIMILAR_USERS: Record<Category, Record<string, { rate: number; n: number }>> = {
  'body-image': {
    s4: { rate: 0.68, n: 52 },
    s7: { rate: 0.61, n: 52 },
    s6: { rate: 0.58, n: 52 },
    s1: { rate: 0.55, n: 52 },
    s2: { rate: 0.52, n: 52 },
    s3: { rate: 0.49, n: 52 },
    s5: { rate: 0.44, n: 52 },
  },
  'social-eating': {
    s3: { rate: 0.71, n: 46 },
    s2: { rate: 0.66, n: 46 },
    s5: { rate: 0.63, n: 46 },
    s6: { rate: 0.5, n: 46 },
    s1: { rate: 0.48, n: 46 },
  },
  stress: {
    s5: { rate: 0.64, n: 61 },
    s8: { rate: 0.6, n: 61 },
    s2: { rate: 0.57, n: 61 },
    s6: { rate: 0.52, n: 61 },
    s1: { rate: 0.5, n: 61 },
    s3: { rate: 0.45, n: 61 },
  },
  other: {
    s8: { rate: 0.12, n: 9 },
  },
}
