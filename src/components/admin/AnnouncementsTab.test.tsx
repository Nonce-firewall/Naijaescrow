import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AnnouncementsTab from './AnnouncementsTab';
import { Announcement } from '../../types';

describe('AnnouncementsTab', () => {
  const sampleAnnouncements: Announcement[] = [
    {
      id: 'ann-1',
      title: 'Platform Maintenance Notice',
      content: 'Servers will update tonight at 11 PM UTC.',
      scope: 'all',
      isActive: true,
      createdAt: Date.now(),
    },
    {
      id: 'ann-2',
      title: 'Trader KYC Guidance',
      content: 'Ensure all docs are valid before submitting.',
      scope: 'private',
      isActive: false,
      createdAt: Date.now() - 10000,
    },
  ];

  it('renders announcements list and active/archived tags', () => {
    render(<AnnouncementsTab announcements={sampleAnnouncements} addToast={vi.fn()} />);

    expect(screen.getByText('Platform Maintenance Notice')).toBeInTheDocument();
    expect(screen.getByText(/Servers will update tonight/i)).toBeInTheDocument();
    expect(screen.getByText('Trader KYC Guidance')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('toggles compose form visibility when New Notice button is clicked', () => {
    render(<AnnouncementsTab announcements={sampleAnnouncements} addToast={vi.fn()} />);

    const newNoticeBtn = screen.getByRole('button', { name: /New Notice/i });
    fireEvent.click(newNoticeBtn);

    expect(screen.getByText('Compose New Announcement')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/e\.g\., Scheduled Network Maintenance/i)
    ).toBeInTheDocument();
  });

  it('triggers onToggleActive when visibility icon is clicked', () => {
    const onToggleActive = vi.fn();
    const addToast = vi.fn();

    render(
      <AnnouncementsTab
        announcements={sampleAnnouncements}
        onToggleActive={onToggleActive}
        addToast={addToast}
      />
    );

    const archiveBtn = screen.getByTitle('Archive announcement');
    fireEvent.click(archiveBtn);

    expect(onToggleActive).toHaveBeenCalledWith('ann-1', false);
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('hidden'), 'success');
  });
});
