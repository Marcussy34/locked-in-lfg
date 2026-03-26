export type ModuleDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface CourseModule {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  difficulty: ModuleDifficulty;
  totalLessons: number;
  estimatedMinutes: number;
}
