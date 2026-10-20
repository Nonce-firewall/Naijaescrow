import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SettingsTab from './SettingsTab';
import { AdminSettings } from '../../types';

describe('SettingsTab', () => {
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

  it('renders settings fields with current values', () => {
    const onSettingsUpdated = vi.fn();
    const addToast = vi.fn();

    render(
      <SettingsTab
        settings={mockSettings}
        onSettingsUpdated={onSettingsUpdated}
        addToast={addToast}
      />
    );

    expect(screen.getByText('Platform Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Zenith Bank')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1012345678')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9ija Escrow Ltd')).toBeInTheDocument();
  });

  it('resets form state when reset button is clicked', () => {
    render(<SettingsTab settings={mockSettings} onSettingsUpdated={vi.fn()} addToast={vi.fn()} />);

    const bankInput = screen.getByDisplayValue('Zenith Bank');
    fireEvent.change(bankInput, { target: { value: 'First Bank' } });
    expect(screen.getByDisplayValue('First Bank')).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /Reset/i });
    fireEvent.click(resetButton);

    expect(screen.getByDisplayValue('Zenith Bank')).toBeInTheDocument();
  });
});
