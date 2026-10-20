import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UsersTab from './UsersTab';
import { UserProfile } from '../../types';

describe('UsersTab', () => {
  const sampleUsers: UserProfile[] = [
    {
      uid: 'usr-1',
      email: 'trader1@test.com',
      role: 'user',
      kycStatus: 'approved',
      accountStatus: 'active',
      createdAt: Date.now(),
      kycData: {
        fullName: 'Trader One',
        idType: 'nin_paper',
        idNumber: '12345678901',
        screenshotUrl: 'https://doc.png',
        submittedAt: Date.now(),
      },
    },
    {
      uid: 'usr-2',
      email: 'badactor@test.com',
      role: 'user',
      kycStatus: 'none',
      accountStatus: 'suspended',
      createdAt: Date.now() - 50000,
    },
    {
      uid: 'usr-3',
      email: 'previoususer@test.com',
      role: 'user',
      kycStatus: 'approved',
      accountStatus: 'pending_reactivation',
      createdAt: Date.now() - 100000,
    },
  ];

  it('renders user directory table with statuses and roles', () => {
    render(
      <UsersTab
        users={sampleUsers}
        addToast={vi.fn()}
      />
    );

    expect(screen.getByText('trader1@test.com')).toBeInTheDocument();
    expect(screen.getByText('badactor@test.com')).toBeInTheDocument();
    expect(screen.getByText('previoususer@test.com')).toBeInTheDocument();
    expect(screen.getByText('Trader One')).toBeInTheDocument();
  });

  it('filters users by search term', () => {
    render(
      <UsersTab
        users={sampleUsers}
        addToast={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by email/i);
    fireEvent.change(searchInput, { target: { value: 'badactor' } });

    expect(screen.getByText('badactor@test.com')).toBeInTheDocument();
    expect(screen.queryByText('trader1@test.com')).not.toBeInTheDocument();
  });

  it('opens manage modal and triggers onSelectUser', () => {
    const onSelectUser = vi.fn();
    render(
      <UsersTab
        users={sampleUsers}
        onSelectUser={onSelectUser}
        addToast={vi.fn()}
      />
    );

    const manageButtons = screen.getAllByRole('button', { name: /Manage/i });
    fireEvent.click(manageButtons[0]);

    expect(onSelectUser).toHaveBeenCalledWith(sampleUsers[0]);
    expect(screen.getByText(/Account Actions for trader1@test.com/i)).toBeInTheDocument();
  });
});
