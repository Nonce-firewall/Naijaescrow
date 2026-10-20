import React, { useState, useEffect } from 'react';
import { AdminSettings } from '../types';
import { updateAdminSettings } from '../lib/dbHelpers';

export function useAdminSettingsForm(
  settings: AdminSettings,
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  onRefresh?: () => void
) {
  const [bankName, setBankName] = useState(settings.ngnBankName);
  const [accountNumber, setAccountNumber] = useState(settings.ngnAccountNumber);
  const [accountName, setAccountName] = useState(settings.ngnAccountName);
  const [usdtSellMarkup, setUsdtSellMarkup] = useState<number>(settings.usdtSellMarkup);
  const [usdtBuyMarkup, setUsdtBuyMarkup] = useState<number>(settings.usdtBuyMarkup);
  const [bscWallet, setBscWallet] = useState(settings.wallets.BSC);
  const [tronWallet, setTronWallet] = useState(settings.wallets.Tron);
  const [polygonWallet, setPolygonWallet] = useState(settings.wallets.Polygon);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setBankName(settings.ngnBankName);
    setAccountNumber(settings.ngnAccountNumber);
    setAccountName(settings.ngnAccountName);
    setUsdtSellMarkup(settings.usdtSellMarkup);
    setUsdtBuyMarkup(settings.usdtBuyMarkup);
    setBscWallet(settings.wallets.BSC);
    setTronWallet(settings.wallets.Tron);
    setPolygonWallet(settings.wallets.Polygon);
  }, [settings]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateAdminSettings({
        ngnBankName: bankName,
        ngnAccountNumber: accountNumber,
        ngnAccountName: accountName,
        usdtSellMarkup,
        usdtBuyMarkup,
        wallets: {
          BSC: bscWallet,
          Tron: tronWallet,
          Polygon: polygonWallet,
        },
      });
      addToast('Settings updated successfully!', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err?.message || 'Failed to update settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return {
    bankName,
    setBankName,
    accountNumber,
    setAccountNumber,
    accountName,
    setAccountName,
    usdtSellMarkup,
    setUsdtSellMarkup,
    usdtBuyMarkup,
    setUsdtBuyMarkup,
    bscWallet,
    setBscWallet,
    tronWallet,
    setTronWallet,
    polygonWallet,
    setPolygonWallet,
    isSavingSettings,
    handleSaveSettings,
  };
}
