import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  formatConditionLabel,
  normalizeConditionLevel,
} from '../../src/features/moderator/models/consignmentModel.js';
import { ConsignmentSummary } from '../../src/features/moderator/components/consignment/ConsignmentDetailSections.jsx';
import {
  CONDITION_PRESETS,
  ConsignmentInspectionForm,
} from '../../src/features/moderator/components/consignment/ConsignmentInspectionForm.jsx';
import { useConsignmentDetail } from '../../src/features/moderator/hooks/useConsignmentDetail.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { consignmentService } from '../../src/features/moderator/services/warehouseApi.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-1', accountId: 'mod-1', warehouseId: 'wh-1' },
    isAuthenticated: true,
  }),
}));

describe('Task 1: Vietnamese declared condition in consignment details', () => {
  it('maps English condition enums to Vietnamese labels and handles fallbacks', () => {
    expect(formatConditionLabel('NEW_TAG')).toBe('Mới, còn tem (100%)');
    expect(formatConditionLabel('LIKE_NEW')).toBe('Như mới (99%)');
    expect(formatConditionLabel('GOOD')).toBe('Tốt, có dấu hiệu dùng (90-95%)');
    expect(formatConditionLabel('FLAW')).toBe('Có lỗi nhỏ (80-85%)');
    expect(formatConditionLabel('like_new')).toBe('Như mới (99%)');
    expect(formatConditionLabel('Đã qua sử dụng nhẹ')).toBe('Đã qua sử dụng nhẹ');
    expect(formatConditionLabel('')).toBe('Chưa khai báo');
    expect(formatConditionLabel(null)).toBe('Chưa khai báo');
  });

  it('normalizes declared condition to preset level keys', () => {
    expect(normalizeConditionLevel('NEW_TAG')).toBe('NEW_TAG');
    expect(normalizeConditionLevel('GOOD')).toBe('GOOD');
    expect(normalizeConditionLevel('flaw')).toBe('FLAW');
    expect(normalizeConditionLevel('Có lỗi nhỏ (80-85%)')).toBe('FLAW');
    expect(normalizeConditionLevel('')).toBe('LIKE_NEW');
  });

  it('renders Vietnamese condition label instead of English enum in ConsignmentSummary', () => {
    render(
      <ConsignmentSummary
        form={{
          name: 'Áo khoác dạ',
          category: 'Áo khoác',
          brand: 'Zara',
          size: 'M',
          condition: 'LIKE_NEW',
          desiredPrice: 500000,
        }}
      />,
    );

    expect(screen.getByText('Như mới (99%)')).toBeInTheDocument();
    expect(screen.queryByText('LIKE_NEW')).not.toBeInTheDocument();
  });
});

describe('Task 3: Pre-fill inspection price and condition from member declaration', () => {
  it('defaults condition level dropdown to declaredCondition and lets moderator change it', () => {
    const setCondition = vi.fn();
    const setPrice = vi.fn();

    render(
      <ConsignmentInspectionForm
        declaredCondition="GOOD"
        price="650000"
        term="30"
        conditionNote=""
        allChecked={true}
        resource={{ busy: false, mutate: vi.fn() }}
        formId="form-1"
        proof={{}}
        setFeedback={vi.fn()}
        setReceiptId={vi.fn()}
        setCondition={setCondition}
        errors={{}}
        setPrice={setPrice}
        setTerm={vi.fn()}
        termOptions={[30]}
        consignmentConfig={{}}
      />,
    );

    const select = screen.getByLabelText('Tình trạng phân loại');
    expect(select.value).toBe('GOOD');

    fireEvent.change(select, { target: { value: 'FLAW' } });
    expect(select.value).toBe('FLAW');
    expect(setCondition).toHaveBeenCalledWith(
      CONDITION_PRESETS.find((p) => p.value === 'FLAW').noteTemplate,
    );
  });

  it('pre-fills price and conditionNote from member form in useConsignmentDetail without overwriting moderator edits', async () => {
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-prefill-1',
      formId: 'form-prefill-1',
      name: 'Túi xách da',
      status: 'INSPECTING',
      condition: 'GOOD',
      desiredPrice: 650000,
      allowedActions: ['COMPLETE_INSPECTION'],
    });

    function Harness() {
      const model = useConsignmentDetail();
      return (
        <div>
          <input
            aria-label="price-input"
            value={model.price}
            onChange={(e) => model.setPrice(e.target.value)}
          />
          <input
            aria-label="condition-input"
            value={model.conditionNote}
            onChange={(e) => model.setCondition(e.target.value)}
          />
          <span data-testid="declared-condition">
            {model.sections.ConsignmentInspectionPanel.declaredCondition || ''}
          </span>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={['/moderator/consignments/form-prefill-1']}>
        <Phase2Provider>
          <Routes>
            <Route path="/moderator/consignments/:formId" element={<Harness />} />
          </Routes>
        </Phase2Provider>
      </MemoryRouter>,
    );

    const priceInput = screen.getByLabelText('price-input');
    const condInput = screen.getByLabelText('condition-input');

    await waitFor(() => {
      expect(priceInput.value).toBe('650000');
      expect(condInput.value).toBe(
        CONDITION_PRESETS.find((p) => p.value === 'GOOD').noteTemplate,
      );
      expect(screen.getByTestId('declared-condition').textContent).toBe('GOOD');
    });

    // Moderator edits both fields; values must remain edited
    fireEvent.change(priceInput, { target: { value: '500000' } });
    fireEvent.change(condInput, { target: { value: 'Trầy nhẹ góc túi' } });
    expect(priceInput.value).toBe('500000');
    expect(condInput.value).toBe('Trầy nhẹ góc túi');
  });
});
