import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from './AuthPage';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase');
vi.mock('../lib/dbHelpers', () => ({
  getOrCreateUserProfile: vi.fn(() =>
    Promise.resolve({
      uid: 'user-123',
      email: 'test@example.com',
      role: 'user',
      kycStatus: 'none',
      accountStatus: 'active',
      createdAt: Date.now(),
    })
  ),
}));

describe('AuthPage', () => {
  const mockOnBack = vi.fn();
  const mockOnAuthSuccess = vi.fn();
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form by default', () => {
    render(
      <AuthPage
        onBack={mockOnBack}
        onAuthSuccess={mockOnAuthSuccess}
        addToast={mockAddToast}
        initialMode="signin"
      />
    );

    expect(screen.getByText(/Sign in to 9ija Escrow/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Min. 6 characters/i)).toBeInTheDocument();
  });

  it('should render signup form when initialMode is signup', () => {
    render(
      <AuthPage
        onBack={mockOnBack}
        onAuthSuccess={mockOnAuthSuccess}
        addToast={mockAddToast}
        initialMode="signup"
      />
    );

    expect(screen.getByText(/Create a Trader Account/i)).toBeInTheDocument();
  });

  it('should show password mismatch error on signup', async () => {
    const user = userEvent.setup();

    render(
      <AuthPage
        onBack={mockOnBack}
        onAuthSuccess={mockOnAuthSuccess}
        addToast={mockAddToast}
        initialMode="signup"
      />
    );

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const passwordInput = screen.getAllByPlaceholderText(/Min. 6 characters|Repeat password/i)[0];
    const confirmPasswordInput = screen.getAllByPlaceholderText(/Min. 6 characters|Repeat password/i)[1];
    const submitButton = screen.getByRole('button', { name: /Create Account/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password456');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        'Passwords do not match',
        'error'
      );
    });
  });

  it('should show password length error on signup', async () => {
    const user = userEvent.setup();

    render(
      <AuthPage
        onBack={mockOnBack}
        onAuthSuccess={mockOnAuthSuccess}
        addToast={mockAddToast}
        initialMode="signup"
      />
    );

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const passwordInput = screen.getAllByPlaceholderText(/Min. 6 characters|Repeat password/i)[0];
    const confirmPasswordInput = screen.getAllByPlaceholderText(/Min. 6 characters|Repeat password/i)[1];
    const submitButton = screen.getByRole('button', { name: /Create Account/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'pass');
    await user.type(confirmPasswordInput, 'pass');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        'Password must be at least 6 characters',
        'error'
      );
    });
  });

  it('should toggle between login and signup forms', async () => {
    const user = userEvent.setup();

    render(
      <AuthPage
        onBack={mockOnBack}
        onAuthSuccess={mockOnAuthSuccess}
        addToast={mockAddToast}
        initialMode="signin"
      />
    );

    expect(screen.getByText(/Sign in to 9ija Escrow/i)).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', {
      name: /Create a new trader account/i,
    });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/Create a Trader Account/i)).toBeInTheDocument();
    });
  });

  it('should show back button and call onBack when clicked', async () => {
    const user = userEvent.setup();

    render(
      <AuthPage
        onBack={mockOnBack}
        onAuthSuccess={mockOnAuthSuccess}
        addToast={mockAddToast}
      />
    );

    const backButton = screen.getByRole('button', { name: /Back/i });
    await user.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should show forgot password option in login form', () => {
    render(
      <AuthPage
        onBack={mockOnBack}
        onAuthSuccess={mockOnAuthSuccess}
        addToast={mockAddToast}
        initialMode="signin"
      />
    );

    expect(screen.getByRole('button', { name: /Forgot password\?/i })).toBeInTheDocument();
  });

  it('should show Google sign-in button', () => {
    render(
      <AuthPage
        onBack={mockOnBack}
        onAuthSuccess={mockOnAuthSuccess}
        addToast={mockAddToast}
      />
    );

    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
  });
});
