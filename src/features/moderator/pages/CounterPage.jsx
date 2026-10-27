import { CounterHandoverTasks } from '../components/counter/CounterHandoverTask.jsx';
import { useCounter } from '../hooks/useCounter.jsx';
import {
  CounterHandoverDialog,
  CounterWorkflowGuide,
  CounterMemberResults,
  CounterConsignmentTasks,
  CounterMemberSummary,
  CounterIdentityPanel,
  CounterLookupForm,
} from '../components/counter/CounterSections.jsx';
import React from "react";
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';

import { Page, ResourceState } from "../components/WarehouseUi.jsx";

export default function CounterPage() {
  const model = useCounter();
  return (
    <Page
      title={
        !model.selected
          ? 'Tra cứu Member tại quầy'
          : !model.confirmed
            ? 'Đã tìm thấy một tài khoản'
            : 'Hồ sơ Member tại quầy'
      }
      subtitle={
        !model.selected
          ? 'Mở hồ sơ và việc cần xử lý của khách đang đứng trước mặt bạn'
          : !model.confirmed
            ? 'Đọc thông tin, hỏi khách vài câu cho chắc, rồi bấm tiếp tục.'
            : `${model.selected.fullName || model.selected.name || 'Member'} (${model.selected.memberCode}) · Đang có mặt tại quầy`
      }
      actions={
        model.selected ? (
          <Button variant="outline" onClick={model.reset}>
            Tra cứu khách khác
          </Button>
        ) : null
      }
    >
      <ResourceState resource={model.results} empty={false} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* ===================== CỘT TRÁI ===================== */}
        <div className="space-y-6">
          {/* Form tra cứu chính (QT-01) */}
          <CounterLookupForm {...model.sections.CounterLookupForm} />

          {/* BƯỚC 2: ĐỐI CHIẾU DANH TÍNH (QT-02) */}
          {model.selected && !model.confirmed && (
            <CounterIdentityPanel {...model.sections.CounterIdentityPanel} />
          )}

          {/* BƯỚC 3: HỒ SƠ MEMBER & VIỆC CẦN XỬ LÝ (QT-03) */}
          {model.selected && model.confirmed && (
            <div className="space-y-5">
              <CounterMemberSummary selected={model.selected} />

              {model.handoverFeedback && (
                <div
                  role="alert"
                  className={`rounded-xl p-4 text-xs font-semibold flex items-center justify-between ${model.handoverFeedback.type === 'success'
                      ? 'bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7]'
                      : 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]'
                    }`}
                >
                  <p>{model.handoverFeedback.message}</p>
                  <button
                    type="button"
                    className="text-xs font-bold underline ml-2 cursor-pointer"
                    onClick={() => model.setHandoverFeedback(null)}
                  >
                    Đóng
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#191C19]">Việc cần xử lý tại quầy hôm nay</h3>
                  <span className="text-xs font-semibold text-[#5B6776]">
                    {model.taskGroups.totalCount ? `${model.taskGroups.totalCount} việc đang chờ` : 'Không có việc chờ'}
                  </span>
                </div>

                <ResourceState resource={model.tasks} empty={model.taskGroups.totalCount === 0}>
                  <div className="space-y-4">
                    {/* 1. Form ký gửi */}
                    {model.taskGroups.pendingForms.length > 0 && (
                      <CounterConsignmentTasks taskGroups={model.taskGroups} />
                    )}

                    {/* 2. Rút hàng giữa kỳ */}
                    {model.taskGroups.pendingWithdrawals.length > 0 && (
                      <CounterHandoverTasks
                        items={model.taskGroups.pendingWithdrawals}
                        context="ITEM_WITHDRAWAL"
                        setConfirmHandover={model.setConfirmHandover}
                      />
                    )}

                    {/* 3. Nhận lại hàng cuối kỳ */}
                    {model.taskGroups.pendingEndOfTerm.length > 0 && (
                      <CounterHandoverTasks
                        items={model.taskGroups.pendingEndOfTerm}
                        context="END_OF_TERM_TAKE_BACK"
                        setConfirmHandover={model.setConfirmHandover}
                      />
                    )}
                  </div>
                </ResourceState>

                <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#191C19]">Danh sách hàng cuối kỳ kho chi nhánh</p>
                    <p className="text-[11px] text-[#5B6776] mt-0.5">
                      Xem toàn bộ danh sách đồ quá hạn hoặc chuyển giao cho tổ chức từ thiện
                    </p>
                  </div>
                  <Link to="/moderator/end-of-term">
                    <Button variant="outline" className="text-xs">
                      Mở trang Hàng cuối kỳ
                    </Button>
                  </Link>
                </div>

                <div className="rounded-xl border border-dashed border-[#9a9a9a] p-3.5 text-xs text-[#5B6776] leading-relaxed">
                  Khách có thể làm nhiều việc trong một lượt đến. Xong việc nào thì việc đó biến khỏi danh sách, không phải tra cứu lại từ đầu.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================== CỘT PHẢI ===================== */}
        <div className="space-y-6">
          {/* Card: Khi tra ra nhiều kết quả (luôn hiển thị nếu có kết quả để có thể chọn đổi người) */}
          <CounterMemberResults {...model.sections.CounterMemberResults} />

          {/* Card: Đã phục vụ gần đây */}
          <CounterWorkflowGuide recentServed={model.recentServed} choose={model.choose} />
        </div>
      </div>

      <QRScannerModal
        isOpen={model.scanner}
        onClose={() => model.setScanner(false)}
        title="Quét QR Member"
        placeholder="Mã Member hoặc nội dung QR Member"
        onScanSuccess={(value) => {
          model.executeLookup('qrPayload', value);
          model.setScanner(false);
        }}
      />

      {/* Modal xác nhận bàn giao tại quầy */}
      {model.confirmHandover && (
        <CounterHandoverDialog {...model.sections.CounterHandoverDialog} />
      )}
    </Page>
  );
}
