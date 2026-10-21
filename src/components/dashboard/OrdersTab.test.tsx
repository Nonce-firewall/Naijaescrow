import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OrdersTab from './OrdersTab';
import { Order } from '../../types';

describe('OrdersTab (User Dashboard)', () => {
  const sampleOrders: Order[] = [
    {
      id: 'ord-buy-1',
      userId: 'usr-1',
      userEmail: 'trader@example.com',
      type: 'buy',
      cryptoAmount: 150,
      ngnAmount: 232500,
      rate: 1550,
      status: 'completed',
      network: 'BSC',
      token: 'USDT',
      paymentScreenshot: 'https://proof.png',
      createdAt: Date.now(),
    },
    {
      id: 'ord-sell-2',
      userId: 'usr-1',
      userEmail: 'trader@example.com',
      type: 'sell',
      cryptoAmount: 300,
      ngnAmount: 450000,
      rate: 1500,
      status: 'pending',
      network: 'Tron',
      token: 'USDT',
      paymentScreenshot: 'https://proof2.png',
      createdAt: Date.now() - 3600000,
    },
  ];

  it('renders order transactions with amounts and rates', () => {
    render(<OrdersTab orders={sampleOrders} />);

    expect(screen.getByText(/Bought 150 USDT/i)).toBeInTheDocument();
    expect(screen.getByText(/Sold 300 USDT/i)).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('filters orders by trade type', () => {
    render(<OrdersTab orders={sampleOrders} />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'buy' } });

    expect(screen.getByText(/Bought 150 USDT/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sold 300 USDT/i)).not.toBeInTheDocument();
  });

  it('triggers onOpenDispute when Open Dispute is clicked on a pending order', () => {
    const onOpenDispute = vi.fn();
    render(<OrdersTab orders={sampleOrders} onOpenDispute={onOpenDispute} />);

    const disputeBtn = screen.getByRole('button', { name: /Open Dispute/i });
    fireEvent.click(disputeBtn);

    expect(onOpenDispute).toHaveBeenCalledWith(sampleOrders[1]);
  });
});
