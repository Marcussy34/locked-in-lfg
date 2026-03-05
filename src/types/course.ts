export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CourseCategory = 'solana' | 'web3' | 'defi' | 'security' | 'rust';

export interface Course {
  id: string;
  slug?: string;
  title: string;
  description: string;
  totalLessons: number;
  completedLessons: number;
  totalModules?: number;
  difficulty: CourseDifficulty;
  category: CourseCategory;
  publishedAt?: string | null;
  imageUrl: string | null;
}
