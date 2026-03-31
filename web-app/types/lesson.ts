export type QuestionType = 'mcq' | 'short_text';
export type LessonBlockType = 'paragraph' | 'code' | 'callout' | 'image';

export interface FlowStep {
  title: string;
  desc: string;
  icon?: string | null;
  color?: string;
}

export interface ConceptItem {
  icon: string;
  name: string;
  desc: string;
}

export interface ChainCard {
  name: string;
  tagline: string;
  desc: string;
  stats: string[];
  theme: 'btc' | 'eth' | 'sol';
}

export interface KVItem {
  label: string;
  value: string;
  desc?: string;
  color?: 'default' | 'red' | 'green' | 'amber';
}

export type BlockVariant =
  | 'analogy'
  | 'flow'
  | 'concepts'
  | 'comparison'
  | 'chain-cards'
  | 'scam'
  | 'checklist'
  | 'takeaway'
  | 'kv-grid';

export interface LessonBlock {
  id: string;
  type: LessonBlockType;
  order: number;
  text?: string;
  language?: string;
  calloutTone?: 'info' | 'warning' | 'tip';
  caption?: string;
  imageUrl?: string;
  variant?: BlockVariant;
  title?: string;
  steps?: FlowStep[];
  items?: (ConceptItem | KVItem | string)[];
  chains?: ChainCard[];
  headers?: string[];
  rows?: string[][];
  highlightRow?: number | null;
  number?: number;
  example?: string;
  exampleSender?: string;
  rule?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: Array<QuestionOption | string>;
  // Mock/offline lessons can still carry a local answer key.
  correctAnswer?: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  order: number;
  content: string;
  blocks?: LessonBlock[];
  questions: Question[];
  version?: number;
  releaseId?: string;
  contentHash?: string;
}

export interface LessonProgress {
  lessonId: string;
  courseId: string;
  completed: boolean;
  score: number | null;
  completedAt: string | null;
}
