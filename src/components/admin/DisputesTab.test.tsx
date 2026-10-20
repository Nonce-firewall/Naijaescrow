import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DisputesTab from './DisputesTab';
import { Dispute } from '../../types';

describe('DisputesTab (Admin)', () => {
  const sampleDisputes: Dispute[] = [
    {
      id: 'disp-1',
      orderId: 'ord-100',
      userId: 'usr-1',
      userEmail: 'trader1@test.com',
      message: 'Paid via bank transfer but order still pending.',
      status: 'open',
      createdAt: Date.now(),
    },
    {
      id: 'disp-2',
      orderId: 'ord-200',
      userId: 'usr-2',
      userEmail: 'trader2@test.com',
      message: 'Blockchain tx sent.',
      status: 'resolved',
      adminResponse: 'Confirmed receipt. Payout completed.',
      createdAt: Date.now() - 30000,
      resolvedAt: Date.now() - 10000,
    },
  ];

  it('renders dispute cards and status labels', () => {
    render(
      <DisputesTab
        disputes={sampleDisputes}
        addToast={vi.fn()}
      />
    );

    expect(screen.getByText('trader1@test.com')).toBeInTheDocument();
    expect(screen.getByText(/Paid via bank transfer/i)).toBeInTheDocument();
    expect(screen.getByText('trader2@test.com')).toBeInTheDocument();
    expect(screen.getByText('Confirmed receipt. Payout completed.')).toBeInTheDocument();
  });

  it('filters disputes by status', () => {
    render(
      <DisputesTab
        disputes={sampleDisputes}
        addToast={vi.fn()}
      />
    );

    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'open' } });

    expect(screen.getByText('trader1@test.com')).toBeInTheDocument();
    expect(screen.queryByText('Confirmed receipt. Payout completed.')).not.toBeInTheDocument();
  });

  it('opens resolution form on Resolve Dispute click', () => {
    const onSelectDispute = vi.fn();
    render(
      <DisputesTab
        disputes={sampleDisputes}
        onSelectDispute={onSelectDispute}
        addToast={vi.fn()}
      />
    );

    const resolveBtn = screen.getByRole('button', { name: /Resolve Dispute/i });
    fireEvent.click(resolveBtn);

    expect(onSelectDispute).toHaveBeenCalledWith(sampleDisputes[0]);
    expect(screen.getByText(/Resolve Dispute for Order #ord-100/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Bank transfer confirmed/i)).toBeInTheDocument();
  });
});
