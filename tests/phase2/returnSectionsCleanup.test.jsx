import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ReturnRequestDetails,
  ReturnReviewDecision,
  ReturnInspectionChecklist,
  ReturnOutcomeDialog,
} from '../../src/features/moderator/components/returns/ReturnSections.jsx';
import { mapReturnItem } from '../../src/features/moderator/services/returnApi.js';

describe('Task 5: Return request detail, inspection checklist & post-refund outcome cleanup', () => {
  it('mapReturnItem does not duplicate reason into buyerNote when buyerNote is absent', () => {
    const mapped = mapReturnItem({
      id: 'ret-1',
      reason: 'Sản phẩm bị lỗi đường may',
    });
    expect(mapped.reason).toBe('Sản phẩm bị lỗi đường may');
    expect(mapped.buyerNote).toBe('');
  });

  it('ReturnRequestDetails removes unwanted disclaimer and does not duplicate reason', () => {
    render(
      <ReturnRequestDetails
        selectedItem={{
          reason: 'Sai kích thước',
          buyerNote: 'Sai kích thước',
          submittedAt: '10:00 19/11/2026',
          buyerPhotos: [],
          stockInPhotos: [],
          packingPhotoUrls: [],
        }}
        setIsCompareModalOpen={() => {}}
      />
    );

    expect(screen.queryByText(/không phải đồng ý hoàn tiền/i)).toBeNull();
    expect(screen.queryByText(/Bạn chưa thấy hàng thật/i)).toBeNull();
    expect(screen.getAllByText(/Sai kích thước/i)).toHaveLength(1);
  });

  it('ReturnReviewDecision removes unwanted payout & address notices and avoids duplicating itemName', () => {
    render(
      <ReturnReviewDecision
        selectedItem={{
          orderNo: 'RH-999',
          buyerName: 'Nguyễn Văn A',
          buyerPhone: '0901234567',
          buyerAddress: '123 Lê Lợi',
          sku: 'SKU-123',
          itemName: 'Áo khoác dạ',
          itemDetails: 'Áo khoác dạ',
          amount: 250000,
          senderCode: 'M-01',
          prevReturns: 'Chưa có vi phạm',
          payoutStatus: 'Chưa chia',
          status: 'PENDING_APPROVAL',
        }}
        handleApproveAndCreateWaybill={() => {}}
        setIsRejectModalOpen={() => {}}
        handleOpenOutcomeModal={() => {}}
      />
    );

    expect(screen.queryByText(/đòi lại tiền đã trả/i)).toBeNull();
    expect(screen.queryByText(/Tiền người ký gửi chỉ chia/i)).toBeNull();
    expect(screen.queryByText(/Địa chỉ do người mua nhập/i)).toBeNull();
    expect(screen.queryByText(/đọc lại trước khi bấm/i)).toBeNull();
    expect(screen.getAllByText('Áo khoác dạ')).toHaveLength(1);
  });

  it('ReturnInspectionChecklist removes checkboxes while keeping all 4 checklist descriptions', () => {
    const { container } = render(
      <ReturnInspectionChecklist checklist={{}} setChecklist={() => {}} selectedItem={{}} />
    );

    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(screen.getByText('Còn nguyên tem Mã hàng hóa trên sản phẩm')).toBeTruthy();
    expect(screen.getByText('Không có hư hỏng mới so với ảnh nhập kho')).toBeTruthy();
    expect(screen.getByText('Không có dấu vết đã qua sử dụng thêm')).toBeTruthy();
    expect(screen.getByText('Đủ phụ kiện đi kèm nếu có')).toBeTruthy();
  });

  it('ReturnOutcomeDialog limits disposition to single Đăng bán lại (Đăng bán liền) option and removes unsupported options', () => {
    render(
      <ReturnOutcomeDialog
        isOutcomeModalOpen={true}
        setIsOutcomeModalOpen={() => {}}
        selectedItem={{
          code: 'YC-100',
          sku: 'SKU-100',
          itemName: 'Túi xách',
          amount: 300000,
          stockInPhotos: [],
        }}
        handleConfirmOutcome={() => {}}
      />
    );

    expect(screen.queryByText(/^Tiêu huỷ$/i)).toBeNull();
    expect(screen.queryByText(/Hoàn trả cho người ký gửi/i)).toBeNull();
    expect(screen.queryByText(/không in lại/i)).toBeNull();
    expect(screen.queryByText(/theo quy định mục 11/i)).toBeNull();
    expect(screen.getByText(/Đăng bán lại \(Đăng bán liền\)/i)).toBeTruthy();
  });
});
