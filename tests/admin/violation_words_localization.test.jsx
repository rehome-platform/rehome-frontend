import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import ToastContainer from '../../src/components/common/ToastContainer.jsx';
import ViolationWordsPage, {
  ACTION_LABELS,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  formatViolationAction,
  formatViolationCategory,
  formatViolationSeverity,
} from '../../src/features/admin/pages/ViolationWordsPage.jsx';
import ViolationWordModal from '../../src/features/admin/pages/ViolationWordModal.jsx';
import violationWordAdminApi from '../../src/features/admin/services/violationWordAdminApi.js';

function wrap(ui) {
  return (
    <MemoryRouter initialEntries={['/admin/violation-words']}>
      <ToastProvider>
        {ui}
        <ToastContainer />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Admin Violation Words Vietnamese localization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('covers all backend ViolationWordCategory, Severity, and Action enums in pure Vietnamese', () => {
    const backendCategories = ['PROFANITY', 'FRAUD', 'COUNTERFEIT', 'SPAM', 'INAPPROPRIATE'];
    const backendSeverities = ['WARNING', 'BLOCKED'];
    const backendActions = ['AUTO_FLAG', 'AUTO_REJECT', 'NOTIFY_ADMIN'];

    for (const key of backendCategories) {
      expect(CATEGORY_LABELS[key]).toBeTruthy();
      expect(CATEGORY_LABELS[key]).not.toBe(key);
      expect(CATEGORY_LABELS[key]).not.toMatch(/Spam/i);
    }
    expect(CATEGORY_LABELS.COUNTERFEIT).toBe('Hàng giả / Hàng nhái');
    expect(CATEGORY_LABELS.SPAM).toBe('Tin rác');

    for (const key of backendSeverities) {
      expect(SEVERITY_LABELS[key]).toBeTruthy();
      expect(SEVERITY_LABELS[key]).not.toBe(key);
    }
    for (const key of backendActions) {
      expect(ACTION_LABELS[key]).toBeTruthy();
      expect(ACTION_LABELS[key]).not.toBe(key);
    }

    expect(formatViolationCategory('counterfeit')).toBe('Hàng giả / Hàng nhái');
    expect(formatViolationCategory('FUTURE_CAT')).toBe('Không xác định');
    expect(formatViolationCategory(null)).toBe('—');
    expect(formatViolationSeverity('UNKNOWN_SEV')).toBe('Không xác định');
    expect(formatViolationAction('UNKNOWN_ACT')).toBe('Không xác định');
  });

  it('renders localized Vietnamese group names in table and keeps raw enum values in filter dropdown & API params', async () => {
    const searchSpy = vi.spyOn(violationWordAdminApi, 'search').mockResolvedValue({
      content: [
        {
          id: 'vw-1',
          word: 'hàng fake',
          category: 'COUNTERFEIT',
          severity: 'BLOCKED',
          action: 'AUTO_REJECT',
          isActive: true,
        },
        {
          id: 'vw-2',
          word: 'hàng super fake',
          category: 'COUNTERFEIT',
          severity: 'BLOCKED',
          action: 'AUTO_REJECT',
          isActive: true,
        },
        {
          id: 'vw-3',
          word: 'lừa đảo',
          category: 'FRAUD',
          severity: 'BLOCKED',
          action: 'NOTIFY_ADMIN',
          isActive: true,
        },
        {
          id: 'vw-4',
          word: 'vay nhanh',
          category: 'SPAM',
          severity: 'WARNING',
          action: 'AUTO_FLAG',
          isActive: true,
        },
        {
          id: 'vw-5',
          word: 'đồ cấm',
          category: 'INAPPROPRIATE',
          severity: 'BLOCKED',
          action: 'AUTO_REJECT',
          isActive: true,
        },
      ],
      totalPages: 1,
      totalElements: 5,
    });

    render(wrap(<ViolationWordsPage />));

    expect(await screen.findByText('hàng fake')).toBeInTheDocument();
    expect(screen.getAllByText('Hàng giả / Hàng nhái').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Tin rác').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('COUNTERFEIT')).not.toBeInTheDocument();
    expect(screen.queryByText(/Tin rác \(Spam\)/)).not.toBeInTheDocument();

    const categoryFilter = screen.getByLabelText('Nhóm vi phạm');
    const cfOption = within(categoryFilter).getByRole('option', {
      name: 'Hàng giả / Hàng nhái',
    });
    expect(cfOption.value).toBe('COUNTERFEIT');

    fireEvent.change(categoryFilter, { target: { value: 'COUNTERFEIT' } });
    await waitFor(() => {
      expect(searchSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'COUNTERFEIT', page: 0 }),
      );
    });
  });

  it('ViolationWordModal displays Vietnamese category options and sends raw COUNTERFEIT enum on create and edit', async () => {
    const createSpy = vi.spyOn(violationWordAdminApi, 'create').mockResolvedValue({ id: 'vw-new' });
    const updateSpy = vi.spyOn(violationWordAdminApi, 'update').mockResolvedValue({ id: 'vw-cf' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      wrap(<ViolationWordModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />),
    );

    const categorySelect = screen.getByLabelText(/Nhóm vi phạm/i);
    expect(
      within(categorySelect).getByRole('option', { name: 'Hàng giả / Hàng nhái' }).value,
    ).toBe('COUNTERFEIT');

    fireEvent.change(screen.getByPlaceholderText('Ví dụ: lừa đảo'), { target: { value: 'hàng rep 1:1' } });
    fireEvent.change(categorySelect, { target: { value: 'COUNTERFEIT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu từ khóa' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'hàng rep 1:1',
          category: 'COUNTERFEIT',
        }),
      );
    });

    rerender(
      wrap(
        <ViolationWordModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
          word={{
            id: 'vw-cf',
            word: 'hàng fake',
            category: 'counterfeit',
            severity: 'blocked',
            action: 'auto_reject',
            isActive: true,
          }}
        />,
      ),
    );

    expect(screen.getByLabelText(/Nhóm vi phạm/i)).toHaveValue('COUNTERFEIT');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu từ khóa' }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'vw-cf',
        expect.objectContaining({
          word: 'hàng fake',
          category: 'COUNTERFEIT',
          severity: 'BLOCKED',
          action: 'AUTO_REJECT',
        }),
      );
    });
  });
});
