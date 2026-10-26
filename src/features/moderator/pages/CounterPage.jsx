import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { counterService } from '../services/warehouseApi.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, lookupParams, normalizeMemberTasks } from '../models/warehouseModel.js';
import {
  Page,
  ResourceState,
  Status,
  DetailLink,
  money,
  date,
} from '../components/WarehouseUi.jsx';

export default function CounterPage() {
  const { identity, setIdentity } = usePhase2();
  const [kind, setKind] = useState('memberCode');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [selected, setSelected] = useState(null);
  const [scanner, setScanner] = useState(false);
  const [confirmHandover, setConfirmHandover] = useState(null);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverFeedback, setHandoverFeedback] = useState(null);
  const [recentServed, setRecentServed] = useState([
    { name: 'Trần Thị Seller 1', memberCode: 'MB000903', memberId: 'a0000000-0000-0000-0000-000000000903', phone: '0911111103', taskNote: 'Kiểm định ký gửi · 08:05' },
    { name: 'Lê Văn Seller 2', memberCode: 'MB000904', memberId: 'a0000000-0000-0000-0000-000000000904', phone: '0911111104', taskNote: 'Bàn giao hàng rút về · 07:40' },
    { name: 'Nguyễn Văn Buyer 1', memberCode: 'MB000901', memberId: 'a0000000-0000-0000-0000-000000000901', phone: '0911111101', taskNote: 'Nhận lại hàng cuối kỳ · hôm qua 16:20' },
  ]);

  const memberCodeInputRef = useRef(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!selected) {
      memberCodeInputRef.current?.focus();
    }
  }, [selected]);

  const results = useResource((options) => counterService.lookup(submitted, options), [submitted], {
    enabled: !!submitted,
  });

  const tasks = useResource(
    (options) => counterService.tasks(selected.memberId, options),
    [selected?.memberId, identity?.identityToken],
    { enabled: !!selected && identity?.memberId === selected.memberId },
  );

  const reset = () => {
    selectedRef.current = null;
    setSelected(null);
    setIdentity(null);
    setSubmitted(null);
    setConfirmHandover(null);
    setHandoverFeedback(null);
    results.clearActionError();
  };

  const executeLookup = (lookupKind, value) => {
    reset();
    setSubmitted(lookupParams(lookupKind, value));
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (query.trim()) {
      executeLookup(kind, query.trim());
    }
  };

  const choose = (member) => {
    selectedRef.current = member;
    setIdentity(null);
    setSelected(member);
    setConfirmHandover(null);
    setHandoverFeedback(null);
    if (member?.fullName || member?.name) {
      setRecentServed((prev) => {
        const next = prev.filter((p) => p.memberCode !== member.memberCode);
        return [
          {
            name: member.fullName || member.name,
            memberCode: member.memberCode,
            memberId: member.memberId || member.accountId,
            phone: member.phone || '',
            taskNote: 'Vừa phục vụ tại quầy',
          },
          ...next.slice(0, 4),
        ];
      });
    }
  };

  const executeHandover = async (item, context) => {
    setHandoverLoading(true);
    setHandoverFeedback(null);
    try {
      await counterService.handover({
        accountId: selected.memberId,
        refId: item.refId || item.id,
        context,
      });
      setHandoverFeedback({
        type: 'success',
        message: `Đã bàn giao thành công "${item.productName || item.productId}" cho khách hàng!`,
      });
      setRecentServed((prev) => {
        const next = prev.filter((p) => p.memberCode !== selected.memberCode);
        return [
          {
            name: selected.fullName || selected.name,
            memberCode: selected.memberCode,
            memberId: selected.memberId,
            phone: selected.phone || '',
            taskNote: `Bàn giao hàng · ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
          },
          ...next.slice(0, 4),
        ];
      });
      setConfirmHandover(null);
      tasks.refresh();
    } catch (err) {
      setHandoverFeedback({
        type: 'error',
        message:
          err.code === 'COUNTER_IDENTITY_NOT_CONFIRMED'
            ? 'Phiên xác nhận danh tính đã hết hạn hoặc chưa được xác nhận. Vui lòng đối chiếu lại danh tính khách hàng.'
            : (err.message || 'Không thể thực hiện bàn giao.'),
      });
      setConfirmHandover(null);
    } finally {
      setHandoverLoading(false);
    }
  };

  const confirmed = !!selected && identity?.memberId === selected.memberId;
  const resultList = listItems(results.data);
  const taskGroups = normalizeMemberTasks(tasks.data);

  return (
    <Page
      title={
        !selected
          ? 'Tra cứu Member tại quầy'
          : !confirmed
          ? 'Đã tìm thấy một tài khoản'
          : 'Hồ sơ Member tại quầy'
      }
      subtitle={
        !selected
          ? 'Mở hồ sơ và việc cần xử lý của khách đang đứng trước mặt bạn'
          : !confirmed
          ? 'Đọc thông tin, hỏi khách vài câu cho chắc, rồi bấm tiếp tục.'
          : `${selected.fullName || selected.name || 'Member'} (${selected.memberCode}) · Đang có mặt tại quầy`
      }
      actions={
        selected ? (
          <Button variant="outline" onClick={reset}>
            Tra cứu khách khác
          </Button>
        ) : null
      }
    >
      <ResourceState resource={results} empty={false} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* ===================== CỘT TRÁI ===================== */}
        <div className="space-y-6">
          {/* Form tra cứu chính (QT-01) */}
          <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#191C19]">
                Hỏi khách mã Member hoặc số điện thoại
              </h2>
              <p className="mt-1 text-xs text-[#5B6776] leading-relaxed">
                Mã Member nằm ở mục Cá nhân trong ứng dụng. Khách không mở được app thì dùng số điện thoại đã đăng ký.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                <label htmlFor="lookup-kind-select" className="text-xs font-semibold text-[#5B6776]">
                  Tra cứu bằng
                </label>
                <select
                  id="lookup-kind-select"
                  className="rounded-lg border border-[#c4c4c4] bg-[#f9faf9] px-2.5 py-1 text-xs font-medium text-[#191C19]"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                  }}
                >
                  <option value="memberCode">Mã Member</option>
                  <option value="phone">Số điện thoại</option>
                </select>
              </div>

              <div>
                <label htmlFor="lookup-query-input" className="block text-xs font-bold text-[#191C19] mb-1.5">
                  {kind === 'phone' ? 'Số điện thoại' : 'Mã Member'}
                </label>
                <input
                  ref={memberCodeInputRef}
                  id="lookup-query-input"
                  type="text"
                  placeholder={kind === 'phone' ? '09xx xxx xxx' : 'MB-0000000'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border-2 border-[#2b2b2b] bg-white px-4 py-3 text-lg font-semibold tracking-wide text-[#191C19] placeholder:text-[#a8a8a8] focus:border-[#006B2C] focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-[#717971]">
                  Con trỏ luôn đặt sẵn ở ô này khi mở màn hình
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={!query.trim()}
                  className="flex-1 py-3 text-sm font-bold bg-[#2b2b2b] text-white hover:bg-black"
                >
                  Tra cứu
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScanner(true)}
                  className="py-3 px-4 text-xs font-semibold"
                >
                  Quét QR Member
                </Button>
              </div>
            </form>

            <div className="rounded-xl border border-[#2b2b2b] bg-[#f4f5f4] p-4 text-xs text-[#2b2b2b] leading-relaxed">
              <p className="font-bold mb-1">Bước bắt buộc sau khi tra ra</p>
              <p>
                Màn tiếp theo đưa <strong>câu hỏi đối chiếu</strong> — email đăng ký, món đang gửi ở kho.
                Phải hỏi và xác nhận rồi mới bàn giao hàng hoặc nhận ký gửi. Mã Member và số điện thoại người khác có thể biết được.
              </p>
            </div>
          </div>

          {/* BƯỚC 2: ĐỐI CHIẾU DANH TÍNH (QT-02) */}
          {selected && !confirmed && (
            <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-6 shadow-sm space-y-5">
              <div className="border-b border-[#d4d4d4] pb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Họ và tên</p>
                <h2 className="text-2xl font-extrabold text-[#191C19] mt-1">
                  {selected.fullName || selected.name}
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-4 border-b border-[#d4d4d4] pb-4 text-xs">
                <div>
                  <p className="text-[10px] text-[#717971] uppercase font-bold">Mã Member</p>
                  <p className="font-bold text-sm text-[#191C19] mt-0.5">{selected.memberCode}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#717971] uppercase font-bold">Số điện thoại</p>
                  <p className="font-bold text-sm text-[#191C19] mt-0.5">{selected.phone || '09xx xxx xxx'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#717971] uppercase font-bold">Email đăng ký</p>
                  <p className="font-bold text-sm text-[#191C19] mt-0.5">{selected.email || 'member***@rehome.vn'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs text-[#5B6776]">
                <div>
                  <p className="text-[10px] text-[#717971] uppercase font-bold">Tham gia từ</p>
                  <p className="font-medium text-[#191C19] mt-0.5">02/2026</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#717971] uppercase font-bold">Đến kho gần nhất</p>
                  <p className="font-medium text-[#191C19] mt-0.5">Hôm nay</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#717971] uppercase font-bold">Lịch sử</p>
                  <p className="font-medium text-[#191C19] mt-0.5">Chưa có vi phạm</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#8a8a8a] bg-[#fcfdfc] p-4 space-y-2">
                <h3 className="text-xs font-bold text-[#191C19] uppercase tracking-wide">
                  Đang ký gửi tại kho này · 4 món
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Quần jeans ống rộng', 'Váy hoa nhí', 'Áo sơ mi linen', 'Áo len cổ lọ'].map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded border border-[#a8a8a8] bg-white text-xs text-[#414942]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-[#9a9a9a] bg-[#f4f5f4] p-4 text-xs text-[#414942] leading-relaxed">
                <p className="font-bold text-[#191C19] mb-1">Trước khi bàn giao hàng</p>
                <p>
                  Hỏi khách email hoặc tên món đang gửi để chắc đúng người. Mã Member và số điện thoại người khác cũng có thể biết.
                  Nếu chỉ nhận hàng ký gửi thì không cần — khách đang đưa đồ cho mình, không lấy gì đi.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  className="flex-[2] py-3.5 text-sm font-bold bg-[#2b2b2b] text-white hover:bg-black"
                  loading={results.busy}
                  disabled={confirmed}
                  onClick={() =>
                    results.mutate((options) => counterService.confirm(selected.memberId, options), {
                      onSuccess: (proof) => {
                        if (proof?.memberId === selectedRef.current?.memberId) setIdentity(proof);
                      },
                    })
                  }
                >
                  Tôi đã đối chiếu đúng Member
                </Button>
                <Button variant="outline" className="flex-1 py-3.5 text-sm font-semibold" onClick={reset}>
                  Tra cứu lại
                </Button>
              </div>
            </div>
          )}

          {/* BƯỚC 3: HỒ SƠ MEMBER & VIỆC CẦN XỬ LÝ (QT-03) */}
          {selected && confirmed && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#006B2C] bg-[#E8F5E9]/50 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#006B2C] text-white font-extrabold flex items-center justify-center text-xl shadow-sm">
                    {(selected.fullName || selected.name || 'M')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#191C19]">{selected.fullName || selected.name}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#006B2C] text-white">
                        Đã xác nhận danh tính
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6776] mt-0.5">
                      {selected.memberCode} · {selected.phone || '09xx xxx xxx'} · Phiên xác nhận hiệu lực 15 phút
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Link to="/moderator/inbox">
                    <Button variant="outline" className="text-xs">
                      Nhắn cho khách
                    </Button>
                  </Link>
                </div>
              </div>

              {handoverFeedback && (
                <div
                  role="alert"
                  className={`rounded-xl p-4 text-xs font-semibold flex items-center justify-between ${
                    handoverFeedback.type === 'success'
                      ? 'bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7]'
                      : 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]'
                  }`}
                >
                  <p>{handoverFeedback.message}</p>
                  <button
                    type="button"
                    className="text-xs font-bold underline ml-2 cursor-pointer"
                    onClick={() => setHandoverFeedback(null)}
                  >
                    Đóng
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#191C19]">Việc cần xử lý tại quầy hôm nay</h3>
                  <span className="text-xs font-semibold text-[#5B6776]">
                    {taskGroups.totalCount ? `${taskGroups.totalCount} việc đang chờ` : 'Không có việc chờ'}
                  </span>
                </div>

                <ResourceState resource={tasks} empty={taskGroups.totalCount === 0}>
                  <div className="space-y-4">
                    {/* 1. Form ký gửi */}
                    {taskGroups.pendingForms.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19]">
                            1. Tiếp nhận hàng ký gửi & Kiểm định
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                            {taskGroups.pendingForms.length}
                          </span>
                        </div>
                        {taskGroups.pendingForms.map((task) => (
                          <div
                            key={task.formId}
                            className="rounded-2xl border-2 border-[#2b2b2b] bg-white overflow-hidden shadow-sm"
                          >
                            <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-2.5 flex items-center justify-between">
                              <span className="text-xs font-bold text-[#191C19]">
                                {task.status === 'APPROVED' ? 'Đã duyệt online — Tiếp nhận & Kiểm định' : 'Form ký gửi'}
                              </span>
                              <span className="text-[11px] text-[#5B6776]">
                                Form {task.formId} · <Status>{task.status}</Status>
                              </span>
                            </div>
                            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <p className="font-bold text-sm text-[#191C19]">{task.name || task.productName || task.formId}</p>
                                <p className="text-xs text-[#5B6776] mt-0.5">
                                  {task.desiredPrice ? `Giá mong muốn: ${money(task.desiredPrice)}` : 'Đang có mặt tại quầy'}
                                </p>
                              </div>
                              <DetailLink formId={task.formId} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 2. Rút hàng giữa kỳ */}
                    {taskGroups.pendingWithdrawals.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19]">
                            2. Khách đến nhận lại hàng rút giữa kỳ
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF3E0] text-[#E65100]">
                            {taskGroups.pendingWithdrawals.length}
                          </span>
                        </div>
                        {taskGroups.pendingWithdrawals.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border-2 border-[#E65100]/40 bg-white overflow-hidden shadow-sm"
                          >
                            <div className="bg-[#FFF8E1] border-b border-[#FFE082] px-4 py-2.5 flex items-center justify-between">
                              <span className="text-xs font-bold text-[#B78103]">
                                Rút hàng giữa kỳ (Chờ nhận lại)
                              </span>
                              <span className="text-[11px] text-[#717971]">
                                Hạn lấy: {date(item.pickupDeadline)}
                              </span>
                            </div>
                            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <p className="font-bold text-sm text-[#191C19]">{item.productName || item.productId}</p>
                                <p className="text-xs text-[#5B6776] mt-0.5">
                                  Mã SP: <span className="font-mono font-bold text-[#191C19]">{item.productId}</span> · Phí rút: {item.feeCharged ? money(item.feeCharged) : 'Miễn phí'}
                                </p>
                              </div>
                              <Button
                                type="button"
                                className="bg-[#2b2b2b] text-white hover:bg-black text-xs font-bold py-2 px-3.5"
                                onClick={() => setConfirmHandover({ item, context: 'ITEM_WITHDRAWAL' })}
                              >
                                Bàn giao cho khách
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 3. Nhận lại hàng cuối kỳ */}
                    {taskGroups.pendingEndOfTerm.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19]">
                            3. Khách đến nhận lại hàng hết kỳ ký gửi
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE7F6] text-[#512DA8]">
                            {taskGroups.pendingEndOfTerm.length}
                          </span>
                        </div>
                        {taskGroups.pendingEndOfTerm.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border-2 border-[#512DA8]/30 bg-white overflow-hidden shadow-sm"
                          >
                            <div className="bg-[#F3E5F5] border-b border-[#E1BEE7] px-4 py-2.5 flex items-center justify-between">
                              <span className="text-xs font-bold text-[#512DA8]">
                                Hàng cuối kỳ (Đã chọn nhận lại)
                              </span>
                              <span className="text-[11px] text-[#717971]">
                                Hạn xử lý: {date(item.deadline)}
                              </span>
                            </div>
                            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <p className="font-bold text-sm text-[#191C19]">{item.productName || item.productId}</p>
                                <p className="text-xs text-[#5B6776] mt-0.5">
                                  Mã SP: <span className="font-mono font-bold text-[#191C19]">{item.productId}</span>
                                </p>
                              </div>
                              <Button
                                type="button"
                                className="bg-[#2b2b2b] text-white hover:bg-black text-xs font-bold py-2 px-3.5"
                                onClick={() => setConfirmHandover({ item, context: 'END_OF_TERM_TAKE_BACK' })}
                              >
                                Bàn giao cho khách
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
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
          <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
            <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-3 text-xs font-bold text-[#191C19]">
              Khi tra ra nhiều kết quả
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-[#5B6776] leading-relaxed">
                Một số điện thoại có thể gắn với nhiều tài khoản. Hệ thống liệt kê để bạn chọn đúng một người, không tự chọn hộ.
              </p>

              {submitted && !results.loading && !resultList.length && (
                <p className="text-xs text-[#BA1A1A] font-semibold py-2">
                  Không tìm thấy Member phù hợp với thông tin đã nhập.
                </p>
              )}

              {resultList.map((member) => {
                const isItemChosen = selected?.memberId === member.memberId;
                return (
                  <div
                    key={member.memberId}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                      isItemChosen ? 'border-2 border-[#2b2b2b] bg-[#f4f5f4]' : 'border-[#c4c4c4] bg-[#fcfdfc]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#006B2C]/10 text-[#006B2C] font-bold flex items-center justify-center text-xs shrink-0">
                        {(member.fullName || member.name || 'M')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#191C19] truncate">
                          {member.fullName || member.name}
                        </p>
                        <p className="text-[11px] text-[#717971] truncate">
                          {member.memberCode} · {member.phone}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={isItemChosen ? 'primary' : 'outline'}
                      onClick={() => choose(member)}
                      className="text-xs py-1.5 px-3 shrink-0"
                    >
                      Chọn Member {member.memberCode}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Đã phục vụ gần đây */}
          <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
            <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-3 text-xs font-bold text-[#191C19]">
              Đã phục vụ gần đây
            </div>
            <div className="divide-y divide-[#E2E8E0]">
              {recentServed.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-[#191C19]">
                      {item.name} · {item.memberCode}
                    </p>
                    <p className="text-[11px] text-[#717971]">{item.taskNote}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      choose({
                        memberId: item.memberId || item.memberCode,
                        memberCode: item.memberCode,
                        fullName: item.name,
                        phone: item.phone,
                      });
                    }}
                    className="px-2.5 py-1 text-xs border border-[#8a8a8a] rounded bg-white hover:bg-[#F0F5EE] font-semibold cursor-pointer"
                  >
                    Mở lại
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={scanner}
        onClose={() => setScanner(false)}
        title="Quét QR Member"
        placeholder="Mã Member hoặc nội dung QR Member"
        onScanSuccess={(value) => {
          executeLookup('qrPayload', value);
          setScanner(false);
        }}
      />

      {/* Modal xác nhận bàn giao tại quầy */}
      {confirmHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#191C19]">
              Xác nhận bàn giao hiện vật tại quầy
            </h3>
            <p className="text-xs text-[#5B6776] leading-relaxed">
              Bạn có chắc chắn đã trao tận tay sản phẩm{' '}
              <strong className="text-[#191C19]">
                {confirmHandover.item.productName || confirmHandover.item.productId}
              </strong>{' '}
              cho khách hàng <strong className="text-[#191C19]">{selected.fullName || selected.name}</strong>?
            </p>
            <div className="rounded-xl bg-[#F0F5EE] p-3 text-xs text-[#414942]">
              Hệ thống sẽ cập nhật trạng thái đã hoàn tất bàn giao. Thao tác này không thể hoàn tác.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                type="button"
                disabled={handoverLoading}
                onClick={() => setConfirmHandover(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                loading={handoverLoading}
                className="bg-[#006B2C] text-white hover:bg-[#005221] font-bold"
                onClick={() => executeHandover(confirmHandover.item, confirmHandover.context)}
              >
                Xác nhận đã bàn giao
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
