import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import OrdersTab from './OrdersTab';
import { Order, AdminSettings } from '../../types';

describe('OrdersTab', () => {
  const mockSettings: AdminSettings = {
    ngnBankName: 'Zenith Bank',
    ngnAccountNumber: '1012345678',
    ngnAccountName: '9ija Escrow Ltd',
    usdtSellMarkup: 100,
    usdtBuyMarkup: 80,
    wallets: {
      BSC: '0xBSC',
      Tron: 'TTron',
      Polygon: '0xPoly',
    },
  };

  const sampleOrders: Order[] = [
    {
      id: 'ord-1',
      userId: 'user-1',
      userEmail: 'user1@example.com',
      type: 'buy',
      cryptoAmount: 100,
      ngnAmount: 150000,
      rate: 1500,
      status: 'pending',
      network: 'BSC',
      token: 'USDT',
      paymentScreenshot: 'https://test/shot.png',
      createdAt: Date.now(),
    },
  ];

  it('renders pending orders and triggers onSelectOrder when clicked', () => {
    const onSelectOrder = vi.fn();
    const onApproveOrder = vi.fn();
    const onRejectOrder = vi.fn();
    const addToast = vi.fn();

    render(
      <OrdersTab
        orders={sampleOrders}
        settings={mockSettings}
        selectedOrder={null}
        blockchainTxId=""
        orderRejectionReason=""
        isProcessingOrder={false}
        onSelectOrder={onSelectOrder}
        onUpdateBlockchainTx={vi.fn()}
        onUpdateRejectionReason={vi.fn()}
        onApproveOrder={onApproveOrder}
        onRejectOrder={onRejectOrder}
        addToast={addToast}
      />
    );

    expect(screen.getByText(/Pending Orders \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/100 USDT/i)).toBeInTheDocument();

    const orderButton = screen.getByRole('button', { name: /100 USDT/i });
    expect(orderButton).toBeInTheDocument();
    fireEvent.click(orderButton);
    expect(onSelectOrder).toHaveBeenCalledWith(sampleOrders[0]);
  });

  it('renders empty message when no pending orders exist', () => {
    render(
      <OrdersTab
        orders={[]}
        settings={mockSettings}
        selectedOrder={null}
        blockchainTxId=""
        orderRejectionReason=""
        isProcessingOrder={false}
        onSelectOrder={vi.fn()}
        onUpdateBlockchainTx={vi.fn()}
        onUpdateRejectionReason={vi.fn()}
        onApproveOrder={vi.fn()}
        onRejectOrder={vi.fn()}
        addToast={vi.fn()}
      />
    );

    expect(screen.getByText(/No pending orders/i)).toBeInTheDocument();
  });
});
