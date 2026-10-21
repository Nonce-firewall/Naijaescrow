import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CoinsTab from './CoinsTab';
import { CoinListing } from '../../types';

describe('CoinsTab', () => {
  const sampleCoins: CoinListing[] = [
    {
      id: 'coin-1',
      name: 'Tether USD',
      symbol: 'USDT',
      network: 'BSC',
      walletAddress: '0x1234567890abcdef',
      rate: 1550,
      feePercentage: 1.0,
      minTradeAmount: 10,
      published: true,
      createdAt: Date.now(),
    },
    {
      id: 'coin-2',
      name: 'Bitcoin',
      symbol: 'BTC',
      network: 'Native',
      walletAddress: 'bc1qtestaddress123',
      rate: 65000000,
      feePercentage: 1.5,
      minTradeAmount: 0.001,
      published: false,
      createdAt: Date.now(),
    },
  ];

  it('renders coin listings with rates and networks', () => {
    render(<CoinsTab coins={sampleCoins} addToast={vi.fn()} />);

    expect(screen.getByText('Tether USD')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('₦1,550')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('filters coin list based on search term', () => {
    render(<CoinsTab coins={sampleCoins} addToast={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('Search coins...');
    fireEvent.change(searchInput, { target: { value: 'Bitcoin' } });

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.queryByText('Tether USD')).not.toBeInTheDocument();
  });

  it('calls onTogglePublish callback when toggle button is clicked', () => {
    const onTogglePublish = vi.fn();
    const addToast = vi.fn();

    render(<CoinsTab coins={sampleCoins} onTogglePublish={onTogglePublish} addToast={addToast} />);

    const hideButtons = screen.getAllByRole('button', { name: /hide/i });
    fireEvent.click(hideButtons[0]);

    expect(onTogglePublish).toHaveBeenCalledWith('coin-1', false);
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('visibility updated'), 'success');
  });
});
