import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { mockSupabase } from './mocks/supabase';
import { setupFetchMock } from './mocks/handlers';

// Mock Supabase client globally using the shared mock module
vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: true,
}));

let fetchMockCleanup: (() => void) | null = null;

beforeEach(() => {
  const { restore } = setupFetchMock();
  fetchMockCleanup = restore;
});

afterEach(() => {
  if (fetchMockCleanup) {
    fetchMockCleanup();
    fetchMockCleanup = null;
  }
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;
