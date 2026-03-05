import type { Lesson } from '@/types';

export function getLessonReadableContent(lesson: Lesson): string {
  if (lesson.content.trim().length > 0) {
    return lesson.content;
  }

  if (!lesson.blocks || lesson.blocks.length === 0) {
    return '';
  }

  return lesson.blocks
    .sort((a, b) => a.order - b.order)
    .map((block) => block.text ?? '')
    .filter(Boolean)
    .join('\n\n');
}
