import { vi } from 'vitest';

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  forward: vi.fn(),
};

export const mockPathname = vi.fn(() => '/courses');
export const mockSearchParams = vi.fn(() => new URLSearchParams());

export function setupNextNavigationMock() {
  vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => mockPathname(),
    useSearchParams: () => mockSearchParams(),
    useParams: () => ({}),
    redirect: vi.fn(),
    notFound: vi.fn(),
  }));
}

export function resetNextNavigationMock() {
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockRouter.prefetch.mockClear();
  mockRouter.refresh.mockClear();
  mockRouter.forward.mockClear();
  mockPathname.mockReturnValue('/courses');
  mockSearchParams.mockReturnValue(new URLSearchParams());
}
