import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { counterService } from '../services/warehouseApi.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, lookupParams } from '../models/warehouseModel.js';
import {
  Page,
  ResourceState,
  Status,
  DetailLink,
} from '../components/WarehouseUi.jsx';

export default function CounterPage() {
  const { identity, setIdentity } = usePhase2();
  const [kind, setKind] = useState('memberCode');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [selected, setSelected] = useState(null);
  const [scanner, setScanner] = useState(false);
  const [recentServed, setRecentServed] = useState([
    { name: 'Trần Thị B', memberCode: 'MB-0098231', phone: '0900000002', taskNote: 'Kiểm định ký gửi · 08:05' },
    { name: 'Lê Minh C', memberCode: 'MB-0101744', phone: '0900000003', taskNote: 'Bàn giao hàng rút về · 07:40' },
    { name: 'Ngô Hải F', memberCode: 'MB-0094012', phone: '0900000004', taskNote: 'Nhận lại hàng cuối kỳ · hôm qua 16:20' },
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
    if (member?.fullName || member?.name) {
      setRecentServed((prev) => {
        const next = prev.filter((p) => p.memberCode !== member.memberCode);
        return [
          {
            name: member.fullName || member.name,
            memberCode: member.memberCode,
            phone: member.phone || '',
            taskNote: 'Vừa phục vụ tại quầy',
          },
          ...next.slice(0, 4),
        ];
      });
    }
  };

  const confirmed = !!selected && identity?.memberId === selected.memberId;
  const resultList = listItems(results.data);

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
                      {selected.memberCode} · {selected.phone} · tham gia 02/2026 · chưa có vi phạm
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#191C19]">Việc cần xử lý tại quầy hôm nay</h3>
                  <span className="text-xs text-[#5B6776]">
                    {listItems(tasks.data).length ? `${listItems(tasks.data).length} việc đang chờ` : 'Không có việc chờ'}
                  </span>
                </div>

                <ResourceState resource={tasks} empty={!listItems(tasks.data).length}>
                  <div className="space-y-3">
                    {listItems(tasks.data).map((task) => (
                      <div
                        key={task.formId}
                        className="rounded-2xl border-2 border-[#2b2b2b] bg-white overflow-hidden shadow-sm"
                      >
                        <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-2.5 flex items-center justify-between">
                          <span className="text-xs font-bold text-[#191C19]">
                            {task.status === 'APPROVED' ? 'Tiếp nhận hàng & Kiểm định' : 'Kiểm định ký gửi'}
                          </span>
                          <span className="text-[11px] text-[#5B6776]">
                            Form {task.formId} · <Status>{task.status}</Status>
                          </span>
                        </div>
                        <div className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-sm text-[#191C19]">{task.name || task.formId}</p>
                            <p className="text-xs text-[#5B6776] mt-0.5">
                              Member khai: Như mới · Đang có mặt tại quầy
                            </p>
                          </div>
                          <DetailLink formId={task.formId} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ResourceState>

                <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#191C19]">Nhận lại hàng cuối kỳ (nếu có yêu cầu)</p>
                    <p className="text-[11px] text-[#5B6776] mt-0.5">
                      Đối chiếu danh tính để bàn giao lại đồ không bán được hoặc hết hạn ký gửi
                    </p>
                  </div>
                  <Link to="/moderator/end-of-term">
                    <Button variant="outline" className="text-xs">
                      Xử lý nhận lại hàng cuối kỳ
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
                        memberId: item.memberCode,
                        memberCode: item.memberCode,
                        fullName: item.name,
                        phone: item.phone,
                      });
                    }}
                    className="px-2.5 py-1 text-xs border border-[#8a8a8a] rounded bg-white hover:bg-[#F0F5EE] font-semibold"
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
    </Page>
  );
}
