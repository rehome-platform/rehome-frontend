import {
  ConsignmentClaimBanner,
  ConsignmentAccessNotice,
  ConsignmentFeedback,
} from '../components/consignment/ConsignmentNotices.jsx';
import { useConsignmentDetail } from '../hooks/useConsignmentDetail.jsx';

import {
  ConsignmentReturnPanel,
  ConsignmentInspectionPanel,
  ConsignmentStartPanel,
  ConsignmentReviewPanel,
  ConsignmentSummary,
  ConsignmentPhotoViewer,
  ConsignmentProgress,
} from '../components/consignment/ConsignmentDetailSections.jsx';
import React from "react";
import { Link } from "react-router-dom";
import Button from '../../../components/common/Button.jsx';

import { Page, ResourceState } from "../components/WarehouseUi.jsx";
import ReceiptPanel from '../components/ReceiptPanel.jsx';

export default function ConsignmentDetailPage() {
  const model = useConsignmentDetail();
  return (
    <Page
      title={model.form?.name ? `Chi tiết ký gửi · ${model.form.name}` : `Chi tiết ký gửi ${model.formId}`}
      subtitle={`Mã đơn: ${model.formId} · Điểm kí gửi ReHome`}
      actions={
        <div className="flex gap-2">
          <Link to="/moderator/queue">
            <Button variant="outline">Quay lại hàng đợi</Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              model.setFeedback(null);
              model.resource.clearActionError();
              model.resource.refresh();
            }}
          >
            Tải lại
          </Button>
        </div>
      }
    >
      <ResourceState resource={model.resource} />

      {model.feedback && (
        <ConsignmentFeedback feedback={model.feedback} setFeedback={model.setFeedback} />
      )}

      {model.resource.error?.status === 403 && !model.form && (
        <ConsignmentAccessNotice />
      )}

      {model.form && (
        <div className="space-y-6">
          {/* STEPPER QUY TRÌNH KIỂM ĐỊNH (KD-03, KD-04, KD-05, KD-07) */}
          {(model.form.status === 'APPROVED' || model.form.status === 'INSPECTING' || model.form.status === 'WAITING_CONFIRMATION' || model.form.status === 'STOCKED') && (
            <ConsignmentProgress identified={model.identified} form={model.form} />
          )}

          {/* KHUNG NHẬN VIỆC / TRẠNG THÁI CLAIM */}
          <ConsignmentClaimBanner {...model.sections.ConsignmentClaimBanner} />

          {/* BỐ CỤC 2 CỘT CHUẨN WIREFRAME (KD-02, KD-04) */}
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] items-start">
            {/* CỘT TRÁI: ẢNH MEMBER GỬI LÊN (KD-02) */}
            <ConsignmentPhotoViewer {...model.sections.ConsignmentPhotoViewer} />

            {/* CỘT PHẢI: THÔNG TIN KHAI BÁO & FORM THAO TÁC */}
            <div className="space-y-5">
              {/* Card 1: Thông tin Member khai */}
              <ConsignmentSummary form={model.form} />

              {/* Card 2: Người ký gửi */}
              {model.form.member && (
                <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 shadow-sm flex items-center gap-3 text-xs">
                  <div className="w-10 h-10 rounded-full bg-[#006B2C]/10 text-[#006B2C] font-bold flex items-center justify-center text-sm shrink-0">
                    {(model.form.member.fullName || 'M')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#191C19]">{model.form.member.fullName} · {model.form.member.memberCode}</p>
                    <p className="text-[#717971] text-[11px] truncate">
                      {model.form.member.phone} · Đã ký gửi 7 món · chưa có vi phạm
                    </p>
                  </div>
                </div>
              )}

              {/* ================= THAO TÁC 1: DUYỆT FORM ONLINE (KD-02) ================= */}
              {(model.allowed('APPROVE') || model.allowed('REJECT')) && (
                <ConsignmentReviewPanel {...model.sections.ConsignmentReviewPanel} />
              )}

              {/* ================= THAO TÁC 2: YÊU CẦU XÁC NHẬN TẠI QUẦY (KD-03) ================= */}
              {(model.allowed('START_INSPECTION') || model.allowed('COMPLETE_INSPECTION') || model.allowed('RETURN_ONSITE')) && !model.identified && (
                <div className="rounded-2xl border-2 border-[#D97706] bg-[#FFFBEB] p-5 space-y-3">
                  <p className="text-xs font-bold text-[#B45309]">Cần đối chiếu danh tính Member tại quầy</p>
                  <p className="text-xs text-[#92400E] leading-relaxed">
                    Khách phải có mặt tại quầy và được xác nhận danh tính trước khi bấm Bắt đầu kiểm định hoặc trả đồ.
                  </p>
                  <Link to="/moderator/counter">
                    <Button className="w-full text-xs font-bold">
                      Đến Quầy tiếp nhận xác nhận Member
                    </Button>
                  </Link>
                </div>
              )}

              {/* Nút Bắt đầu kiểm định (KD-03) */}
              {model.allowed('START_INSPECTION') && model.identified && (
                <ConsignmentStartPanel {...model.sections.ConsignmentStartPanel} />
              )}

              {/* ================= THAO TÁC 3: CHECKLIST KIỂM ĐỊNH & CHỐT GIÁ (KD-04, KD-05) ================= */}
              {model.allowed('COMPLETE_INSPECTION') && model.identified && (
                <ConsignmentInspectionPanel {...model.sections.ConsignmentInspectionPanel} />
              )}

              {/* ================= THAO TÁC 4: TRẢ ĐỒ TẠI CHỖ (KD-06) ================= */}
              {model.allowed('RETURN_ONSITE') && model.identified && (
                <ConsignmentReturnPanel {...model.sections.ConsignmentReturnPanel} />
              )}
            </div>
          </div>

          {/* ================= BIÊN NHẬN & NHẬP KHO (KD-07, KD-08, KD-10) ================= */}
          {(model.form.receiptId || model.resultReceiptId) && (
            <div className="pt-4 border-t border-[#d4d4d4]">
              <ReceiptPanel
                receiptId={model.form.receiptId || model.resultReceiptId}
                allowStockIn
                onStocked={model.resource.refresh}
              />
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
