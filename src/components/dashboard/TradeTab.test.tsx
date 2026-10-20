import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TradeTab from './TradeTab';
import { UserProfile, AdminSettings, CoinListing } from '../../types';

describe('TradeTab', () => {
  const mockUser: UserProfile = {
    uid: 'user-123',
    email: 'trader@example.com',
    role: 'user',
    kycStatus: 'approved',
    accountStatus: 'active',
    createdAt: Date.now(),
  };

  const mockSettings: AdminSettings = {
    ngnBankName: 'Zenith Bank',
    ngnAccountNumber: '1012345678',
    ngnAccountName: '9ija Escrow Ltd',
    usdtSellMarkup: 1550,
    usdtBuyMarkup: 1530,
    wallets: {
      BSC: '0xBSC',
      Tron: 'TTron',
      Polygon: '0xPoly',
    },
  };

  const mockCoins: CoinListing[] = [
    {
      id: 'coin-1',
      name: 'Tether USDT',
      symbol: 'USDT',
      network: 'BSC',
      walletAddress: '0xBSC',
      rate: 1550,
      published: true,
      pricePegged: true,
      feePercentage: 0,
      minTradeAmount: 10,
      minBuyAmount: 10,
      minSellAmount: 10,
      createdAt: Date.now(),
    },
  ];

  it('renders Buy and Sell toggle buttons and switches modes', () => {
    render(
      <TradeTab
        userProfile={mockUser}
        coins={mockCoins}
        settings={mockSettings}
        liveNgnRate={1550}
        addToast={vi.fn()}
        onOrderCreated={vi.fn()}
      />
    );

    const buyButton = screen.getByRole('button', { name: /Buy USDT/i });
    const sellButton = screen.getByRole('button', { name: /Sell USDT/i });

    expect(buyButton).toBeInTheDocument();
    expect(sellButton).toBeInTheDocument();

    fireEvent.click(sellButton);
    expect(sellButton).toHaveClass('bg-[#008751]');
    expect(buyButton).toHaveClass('bg-gray-100');
  });

  it('validates required fields before submitting order', async () => {
    const addToast = vi.fn();
    render(
      <TradeTab
        userProfile={mockUser}
        coins={mockCoins}
        settings={mockSettings}
        liveNgnRate={1550}
        addToast={addToast}
        onOrderCreated={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Create Trade Order/i });
    fireEvent.click(submitButton);

    expect(addToast).toHaveBeenCalledWith('Please fill in all required fields', 'error');
  });
});
