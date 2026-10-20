import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App, { STATIC_ROUTES } from './App';
import { mockSupabase } from './lib/supabase.mock';

describe('App routing and state gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defines static routes for /privacy, /terms, and /support', () => {
    expect(STATIC_ROUTES['/privacy']).toBeDefined();
    expect(STATIC_ROUTES['/terms']).toBeDefined();
    expect(STATIC_ROUTES['/support']).toBeDefined();
  });

  it('renders landing page by default when not on a static route and unauthenticated', async () => {
    mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(<App />);

    await waitFor(() => {
      // Landing page elements should be present
      expect(screen.getAllByText(/Escrow/i).length).toBeGreaterThan(0);
    });
  });

  it('renders sign in button for unauthenticated users', async () => {
    mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});
