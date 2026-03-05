import type { CourseCatalogSnapshot } from '../types';

export interface ContentProvider {
  loadCatalogSnapshot(): Promise<CourseCatalogSnapshot>;
}
