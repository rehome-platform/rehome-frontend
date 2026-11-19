import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import baseApi from '../../src/services/baseApi.js';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import { AuthProvider, useAuth } from '../../src/context/AuthContext.jsx';
import { PackingShipmentPanel, PackingScanPanel } from '../../src/features/moderator/components/packing/PackingDetailSections.jsx';
import { PackingWrongItemModal } from '../../src/features/moderator/components/packing/PackingWrongItemModal.jsx';
import { ReturnInspectionVerdict } from '../../src/features/moderator/components/returns/ReturnSections.jsx';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { VerificationLegalChanges } from '../../src/features/moderator/components/verification/VerificationSections.jsx';

describe('Track 2: Dead buttons, mock data removal, and modals', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('PackingShipmentPanel and PackingScanPanel omit removed GHN handover card and claim warning', () => {
    render(
      <ToastProvider>
        <PackingShipmentPanel
          order={{ orderId: 'ORD-1', ghnTrackingCode: 'GHN-123', status: 'PACKING' }}
          onOpenPrintModal={() => {}}
        />
        <PackingScanPanel
          totalCount={1}
          order={{ orderId: 'ORD-1', status: 'SHIPPING' }}
          scope={{ userId: 'mod-1' }}
          now={Date.now()}
          scan={() => {}}
          sku=""
          input={{ current: null }}
          setSku={() => {}}
          uncertain={false}
          resource={{ busy: false, loading: false }}
          setCamera={() => {}}
          message=""
          create={() => {}}
        />
      </ToastProvider>
    );

    expect(screen.queryByText(/Khi shipper đã lấy hàng/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đã bàn giao cho GHN/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Đơn chưa cho phép thao tác/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In vận đơn A5/i })).toBeEnabled();
  });

  it('BUG-M2-001: PackingWrongItemModal has no DH-00244 or RH-C2M08P hardcoded fallbacks', () => {
    render(
      <PackingWrongItemModal
        isOpen
        onClose={() => {}}
        wrongItem={{ productId: 'SKU-WRONG-1', name: 'Áo sơ mi', brand: 'Uniqlo', size: 'L' }}
        currentOrderNo=""
        targetItem={null}
      />
    );

    expect(screen.queryByText(/DH-00244/)).not.toBeInTheDocument();
    expect(screen.queryByText(/RH-C2M08P/)).not.toBeInTheDocument();
    expect(screen.getByText(/Món này không thuộc đơn hiện tại/i)).toBeInTheDocument();
    expect(screen.getAllByText('SKU-WRONG-1').length).toBeGreaterThan(0);
  });

  it('BUG-M2-003 / BUG-M5-007: ReturnInspectionVerdict calls handleReleaseReturn and returnService.release posts to /return-requests/{id}/release', async () => {
    const handleReleaseReturn = vi.fn();
    render(
      <ToastProvider>
        <ReturnInspectionVerdict
          selectedItem={{ id: 'ret-99', isInspectorSelf: true, stockInDate: '01/11/2026' }}
          inspectionVerdict=""
          setInspectionVerdict={() => {}}
          invalidReason=""
          setInvalidReason={() => {}}
          handleSaveInspection={() => {}}
          handleReleaseReturn={handleReleaseReturn}
          releasingReturn={false}
        />
      </ToastProvider>
    );

    const releaseBtn = screen.getByRole('button', { name: /Chuyển cho/i });
    fireEvent.click(releaseBtn);
    expect(handleReleaseReturn).toHaveBeenCalledTimes(1);

    const reqSpy = vi.spyOn(baseApi, 'request').mockResolvedValue({ data: { released: true } });
    await returnService.release('ret-99');
    expect(reqSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/return-requests/ret-99/release',
      })
    );
  });

  it('BUG-M3-006: VerificationLegalChanges opens protected legal document preview modal and revokes object URL on close', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:legal-doc-1');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const getSpy = vi.spyOn(baseApi, 'get').mockResolvedValue({
      data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    });

    render(
      <ToastProvider>
        <VerificationLegalChanges
          legalChanges={[
            {
              id: 'chg-1',
              requestId: 'chg-1',
              organizationId: 'org-42',
              orgName: 'Quỹ Hy Vọng',
              fieldChanged: 'Giấy phép ĐKKD',
              oldValue: 'Cũ',
              newValue: 'Mới',
              status: 'PENDING',
              fileName: 'license.pdf',
            },
          ]}
        />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Xem chi tiết/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem tài liệu' }));

    await waitFor(() =>
      expect(getSpy).toHaveBeenCalledWith('/api/organizations/org-42/legal-files/license.pdf', {
        responseType: 'blob',
      })
    );
    await waitFor(() => expect(createUrlSpy).toHaveBeenCalledTimes(1));

    const closeButtons = screen.getAllByRole('button', { name: 'Đóng' });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    await waitFor(() => expect(revokeUrlSpy).toHaveBeenCalledWith('blob:legal-doc-1'));
  });

  it('BUG-M5-005: AuthContext.updateProfile calls PUT /api/auth/me for Moderator/Admin and updates user state + storage', async () => {
    const modUser = { id: 'mod-1', email: 'mod@rehome.vn', role: 'MODERATOR', fullName: 'Mod Cũ', phone: '0900000000' };
    localStorage.setItem('rehome_user', JSON.stringify(modUser));
    localStorage.setItem('rehome_token', 'test-token');
    const getSpy = vi.spyOn(baseApi, 'get').mockResolvedValue({ data: { data: modUser } });
    const putSpy = vi.spyOn(baseApi, 'put').mockResolvedValue({
      data: { data: { fullName: 'Mod Mới', phone: '0912345678' } },
    });

    function Probe() {
      const { user, isInitializing, updateProfile } = useAuth();
      return (
        <div>
          <span data-testid="init-state">{isInitializing ? 'loading' : 'ready'}</span>
          <span data-testid="user-name">{user?.fullName}</span>
          <button
            type="button"
            onClick={() => updateProfile({ fullName: 'Mod Mới', phone: '0912345678' })}
          >
            Save
          </button>
        </div>
      );
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('init-state')).toHaveTextContent('ready'));
    expect(getSpy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(putSpy).toHaveBeenCalledWith('/api/auth/me', {
        fullName: 'Mod Mới',
        phone: '0912345678',
      })
    );
    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('Mod Mới'));
    expect(JSON.parse(localStorage.getItem('rehome_user')).fullName).toBe('Mod Mới');
  });
});
