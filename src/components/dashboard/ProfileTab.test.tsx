import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProfileTab from './ProfileTab';
import { UserProfile } from '../../types';

describe('ProfileTab (User Dashboard)', () => {
  const sampleUser: UserProfile = {
    uid: 'usr-12345',
    email: 'trader@domain.com',
    role: 'user',
    kycStatus: 'approved',
    accountStatus: 'active',
    createdAt: Date.now(),
    notificationPreferences: {
      orderUpdates: true,
      kycUpdates: true,
      announcements: false,
    },
  };

  it('renders user details and current role/status', () => {
    render(<ProfileTab userProfile={sampleUser} addToast={vi.fn()} />);

    expect(screen.getByText('trader@domain.com')).toBeInTheDocument();
    expect(screen.getByText(/UID: usr-12345/i)).toBeInTheDocument();
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('Security & Password')).toBeInTheDocument();
  });

  it('toggles notification preference checkboxes', () => {
    render(<ProfileTab userProfile={sampleUser} addToast={vi.fn()} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    fireEvent.click(checkboxes[2]);
    expect(checkboxes[2]).toBeChecked();
  });

  it('shows confirmation when Request Account Deletion is clicked', () => {
    render(<ProfileTab userProfile={sampleUser} addToast={vi.fn()} />);

    const deleteBtn = screen.getByRole('button', { name: /Request Account Deletion/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Are you absolutely sure/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yes, Delete My Account/i })).toBeInTheDocument();
  });
});
