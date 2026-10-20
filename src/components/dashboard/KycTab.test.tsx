import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KycTab from './KycTab';
import { UserProfile } from '../../types';

describe('KycTab (User Dashboard)', () => {
  const verifiedUser: UserProfile = {
    uid: 'usr-1',
    email: 'verified@example.com',
    role: 'user',
    kycStatus: 'approved',
    accountStatus: 'active',
    createdAt: Date.now(),
    kycData: {
      fullName: 'Alice Johnson',
      idType: 'nin_paper',
      idNumber: '12345678901',
      screenshotUrl: 'https://doc.png',
      submittedAt: Date.now(),
    },
  };

  const unverifiedUser: UserProfile = {
    uid: 'usr-2',
    email: 'unverified@example.com',
    role: 'user',
    kycStatus: 'none',
    accountStatus: 'active',
    createdAt: Date.now(),
  };

  it('renders verified trader status for approved user without submission form', () => {
    render(<KycTab userProfile={verifiedUser} addToast={vi.fn()} />);

    expect(screen.getByText(/Verified Trader/i)).toBeInTheDocument();
    expect(screen.queryByText(/Submit Identity Information/i)).not.toBeInTheDocument();
  });

  it('renders submission form for unverified user and triggers onSubmitKYC', async () => {
    const onSubmitKYC = vi.fn().mockResolvedValue(undefined);
    const addToast = vi.fn();

    render(
      <KycTab
        userProfile={unverifiedUser}
        addToast={addToast}
        onSubmitKYC={onSubmitKYC}
      />
    );

    expect(screen.getByText(/Unverified/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit Identity Information/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/As shown on your official ID/i);
    const idInput = screen.getByPlaceholderText(/e\.g\. 11-digit NIN/i);
    const docInput = screen.getByPlaceholderText(/https:\/\/... or photo link/i);
    const holdingInput = screen.getByPlaceholderText(/https:\/\/... or snapshot link/i);

    fireEvent.change(nameInput, { target: { value: 'Bob Smith' } });
    fireEvent.change(idInput, { target: { value: '12345678901' } });
    fireEvent.change(docInput, { target: { value: 'https://doc.png' } });
    fireEvent.change(holdingInput, { target: { value: 'https://selfie.png' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Verification/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitKYC).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Bob Smith',
          idNumber: '12345678901',
          screenshotUrl: 'https://doc.png',
          holdingIdUrl: 'https://selfie.png',
        })
      );
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('KYC submitted'), 'success');
    });
  });
});
