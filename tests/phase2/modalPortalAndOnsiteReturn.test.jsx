import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../../src/components/common/Modal.jsx';
import { ConsignmentReturnPanel } from '../../src/features/moderator/components/consignment/ConsignmentDetailSections.jsx';

describe('Task 2: Modal portal full-viewport backdrop & ConsignmentReturnPanel auto-close', () => {
  it('renders Modal overlay directly inside document.body via portal (escaping space-y-6 parent)', () => {
    const { container } = render(
      <div className="space-y-6" data-testid="page-wrapper">
        <div>Sibling</div>
        <Modal isOpen={true} onClose={() => {}} title="Trả đồ tại chỗ">
          <div>Nội dung modal</div>
        </Modal>
      </div>
    );

    const wrapper = container.querySelector('[data-testid="page-wrapper"]');
    const dialog = screen.getByRole('dialog');
    expect(wrapper.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    expect(dialog.parentElement.className).toContain('fixed');
    expect(dialog.parentElement.className).toContain('inset-0');
  });

  it('calls onClose after ConsignmentReturnPanel confirms onsite return successfully', () => {
    const onClose = vi.fn();
    const setFeedback = vi.fn();
    const resource = {
      busy: false,
      mutate: vi.fn((_fn, callbacks) => {
        callbacks?.onSuccess?.();
      }),
    };

    render(
      <ConsignmentReturnPanel
        resource={resource}
        formId="form-1"
        proof={{}}
        returnReason="Hư hỏng nặng"
        returnNote="Rách lớn ở tay áo"
        setFeedback={setFeedback}
        setReturnReason={() => {}}
        returnReasons={['Hư hỏng nặng']}
        setReturnNote={() => {}}
        errors={{}}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Xác nhận trả đồ tại chỗ/i }));

    expect(resource.mutate).toHaveBeenCalledTimes(1);
    expect(setFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
