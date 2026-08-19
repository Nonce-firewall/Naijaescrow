import React, { useState, useEffect } from 'react';
import { AdminSettings } from '../../types';
import { updateAdminSettings } from '../../lib/dbHelpers';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface SettingsTabProps {
  settings: AdminSettings;
  onSettingsUpdated: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function SettingsTab({ settings, onSettingsUpdated, addToast }: SettingsTabProps) {
  const [formState, setFormState] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setFormState(settings);
    setIsDirty(false);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAdminSettings(formState);
      addToast('Settings saved successfully!', 'success');
      setIsDirty(false);
      onSettingsUpdated();
    } catch (err) {
      addToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormState(settings);
    setIsDirty(false);
  };

  const handleChange = (field: keyof AdminSettings, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E0E7E0] p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-[#008751]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]">Platform Settings</h3>
        </div>

        <div className="space-y-4">
          {/* NGN Bank Details */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
              NGN Bank Name
            </label>
            <input
              type="text"
              value={formState.ngnBankName}
              onChange={(e) => handleChange('ngnBankName', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
              NGN Account Number
            </label>
            <input
              type="text"
              value={formState.ngnAccountNumber}
              onChange={(e) => handleChange('ngnAccountNumber', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
              Account Name
            </label>
            <input
              type="text"
              value={formState.ngnAccountName}
              onChange={(e) => handleChange('ngnAccountName', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
            />
          </div>

          {/* Wallet Addresses */}
          <div className="pt-4 border-t border-[#E0E7E0]">
            <h4 className="text-sm font-bold text-[#1A1A1A] mb-3">Wallet Addresses</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">BSC Wallet</label>
                <input
                  type="text"
                  value={formState.wallets.BSC}
                  onChange={(e) => handleChange('wallets', { ...formState.wallets, BSC: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tron Wallet</label>
                <input
                  type="text"
                  value={formState.wallets.Tron}
                  onChange={(e) => handleChange('wallets', { ...formState.wallets, Tron: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Polygon Wallet</label>
                <input
                  type="text"
                  value={formState.wallets.Polygon}
                  onChange={(e) => handleChange('wallets', { ...formState.wallets, Polygon: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save/Reset Buttons */}
        <div className="flex gap-2 mt-6 pt-6 border-t border-[#E0E7E0]">
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex-1 py-2 px-3 rounded-xl bg-[#008751] hover:bg-[#007043] text-white text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={handleReset}
            disabled={!isDirty}
            className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-semibold disabled:opacity-50 transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
