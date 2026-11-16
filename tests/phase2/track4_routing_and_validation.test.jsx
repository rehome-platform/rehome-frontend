import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { getQueueLinkTarget } from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { id: 'mod-1', role: 'moderator' },
  }),
}));

vi.mock('../../src/features/moderator/pages/index.js', () => ({
  CounterPage: () => <div>CounterPage</div>,
  ConsignmentListPage: () => <div>ConsignmentListPage</div>,
  ConsignmentDetailPage: () => <div>ConsignmentDetailPage</div>,
  ConsignmentPrintQueuePage: () => <div>ConsignmentPrintQueuePage</div>,
  InventoryDetailPage: () => <div>InventoryDetailPage</div>,
  EndOfTermPage: () => <div>EndOfTermPage</div>,
  ConsignmentQueuePage: () => <div>ConsignmentQueuePage</div>,
  WarehouseInventoryPage: () => <div>WarehouseInventoryPage</div>,
  PackingOrdersPage: () => <div>PackingOrdersPage</div>,
  ReturnProcessingPage: () => <div>ReturnProcessingPage</div>,
  OrgVerificationPage: () => <div>OrgVerificationPage</div>,
  ViolationReportsPage: () => <div>ViolationReportsPage</div>,
  DonationsPage: () => <div>DonationsPage</div>,
  CategoryBrandPage: () => <div>CategoryBrandPage</div>,
  WarehouseInboxPage: () => <div>WarehouseInboxPage</div>,
  WarehouseHomePage: () => <div>WarehouseHomePage</div>,
  ReConsignNegotiationPage: () => <div>ReConsignNegotiationPage</div>,
}));

import AppRouter from '../../src/routes/AppRouter.jsx';
import { ConsignmentInspectionForm } from '../../src/features/moderator/components/consignment/ConsignmentInspectionForm.jsx';

describe('AppRouter static vs dynamic consignment routes (BUG-M1-001 / BUG-E2E-006)', () => {
  it('routes /moderator/consignments/queue to ConsignmentQueuePage instead of ConsignmentDetailPage', () => {
    render(
      <MemoryRouter initialEntries={['/moderator/consignments/queue']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('ConsignmentQueuePage')).toBeTruthy();
    expect(screen.queryByText('ConsignmentDetailPage')).toBeNull();
  });

  it('routes /moderator/consignments/:formId to ConsignmentDetailPage for actual form IDs', () => {
    render(
      <MemoryRouter initialEntries={['/moderator/consignments/form-123']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(screen.getByText('ConsignmentDetailPage')).toBeTruthy();
  });
});

describe('ConsignmentQueuePage DONATION_PREP link target (BUG-M3-001 / BUG-E2E-011)', () => {
  it('routes DONATION_PREP items to /moderator/donations instead of /moderator/consignments/:id', () => {
    expect(
      getQueueLinkTarget({ type: 'DONATION_PREP', refId: 'don-99', campaignId: 'camp-1' }),
    ).toBe('/moderator/donations?donationId=don-99&campaignId=camp-1');

    expect(
      getQueueLinkTarget({ type: 'DONATION_PREP', id: 'don-42' }),
    ).toBe('/moderator/donations?donationId=don-42');
  });
});

describe('ConsignmentInspectionForm minimum 1000 VND validation (BUG-M1-011)', () => {
  it('shows inline error and disables submit when agreedPrice is below 1000 VND', () => {
    const setPrice = vi.fn();
    render(
      <ConsignmentInspectionForm
        price="500"
        term="30"
        conditionNote="Hàng còn mới 95%"
        allChecked={true}
        resource={{ busy: false, mutate: vi.fn() }}
        formId="form-1"
        proof={{}}
        setFeedback={vi.fn()}
        setReceiptId={vi.fn()}
        setCondition={vi.fn()}
        errors={{}}
        setPrice={setPrice}
        setTerm={vi.fn()}
        termOptions={[30]}
        consignmentConfig={null}
      />,
    );

    expect(screen.getByText('Giá tối thiểu phải từ 1.000đ')).toBeTruthy();
    const submitBtn = screen.getByRole('button', { name: /Đạt kiểm định/i });
    expect(submitBtn.disabled).toBe(true);
  });

  it('enables submit when agreedPrice is >= 1000 VND', () => {
    render(
      <ConsignmentInspectionForm
        price="1000"
        term="30"
        conditionNote="Hàng còn mới 95%"
        allChecked={true}
        resource={{ busy: false, mutate: vi.fn() }}
        formId="form-1"
        proof={{}}
        setFeedback={vi.fn()}
        setReceiptId={vi.fn()}
        setCondition={vi.fn()}
        errors={{}}
        setPrice={vi.fn()}
        setTerm={vi.fn()}
        termOptions={[30]}
        consignmentConfig={null}
      />,
    );

    expect(screen.queryByText('Giá tối thiểu phải từ 1.000đ')).toBeNull();
    const submitBtn = screen.getByRole('button', { name: /Đạt kiểm định/i });
    expect(submitBtn.disabled).toBe(false);
  });
});
