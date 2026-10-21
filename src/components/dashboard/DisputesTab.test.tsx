import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DisputesTab from './DisputesTab';
import { Dispute, Order } from '../../types';

describe('DisputesTab (User Dashboard)', () => {
  const sampleDisputes: Dispute[] = [
    {
      id: 'disp-1',
      orderId: 'ord-abc-12345678',
      userId: 'usr-1',
      userEmail: 'trader@example.com',
      message: 'Bank transfer completed but crypto not released yet.',
      status: 'open',
      createdAt: Date.now(),
    },
  ];

  const sampleOrders: Order[] = [
    {
      id: 'ord-abc-12345678',
      userId: 'usr-1',
      userEmail: 'trader@example.com',
      type: 'buy',
      cryptoAmount: 100,
      ngnAmount: 155000,
      rate: 1550,
      status: 'pending',
      network: 'BSC',
      token: 'USDT',
      paymentScreenshot: 'https://proof.png',
      createdAt: Date.now(),
    },
  ];

  it('renders existing user dispute message and status', () => {
    render(
      <DisputesTab
        disputes={sampleDisputes}
        orders={sampleOrders}
        userEmail="trader@example.com"
        userId="usr-1"
        addToast={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Bank transfer completed but crypto not released/i)
    ).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('toggles new dispute form and submits dispute', async () => {
    const onSubmitDispute = vi.fn().mockResolvedValue(undefined);
    const addToast = vi.fn();

    render(
      <DisputesTab
        disputes={[]}
        orders={sampleOrders}
        userEmail="trader@example.com"
        userId="usr-1"
        addToast={addToast}
        onSubmitDispute={onSubmitDispute}
      />
    );

    const newBtn = screen.getByRole('button', { name: /New Dispute/i });
    fireEvent.click(newBtn);

    expect(screen.getByText('File a Transaction Dispute')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ord-abc-12345678' } });

    const textarea = screen.getByPlaceholderText(/State what went wrong/i);
    fireEvent.change(textarea, { target: { value: 'Dispute description details' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Dispute/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitDispute).toHaveBeenCalledWith(
        'ord-abc-12345678',
        'Dispute description details'
      );
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Dispute opened'), 'success');
    });
  });
});
