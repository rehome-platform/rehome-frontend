import { CounterHandoverTask } from './CounterHandoverTask.jsx';
import React from "react";
import { Link } from "react-router-dom";
import Button from "../../../../components/common/Button.jsx";

import { counterService } from "../../services/warehouseApi.js";

import { Status, DetailLink, money } from "../WarehouseUi.jsx";

export function CounterHandoverDialog({ confirmHandover, selected, handoverLoading, setConfirmHandover, executeHandover }) {
  return (
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
  );
}

export function CounterWorkflowGuide({ recentServed, choose }) {
  return (
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
  );
}

export function CounterMemberResults({ submitted, results, resultList, selected, choose }) {
  return (
    <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-3 text-xs font-bold text-[#191C19]">
        Kết quả
      </div>
      <div className="p-4 space-y-3">
    
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
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${isItemChosen ? 'border-2 border-[#2b2b2b] bg-[#f4f5f4]' : 'border-[#c4c4c4] bg-[#fcfdfc]'
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
  );
}





export function CounterConsignmentTasks({ taskGroups }) {
  return (
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
  );
}

export function CounterMemberSummary({ selected }) {
  return (
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
  );
}

export function CounterIdentityPanel({ selected, results, confirmed, selectedRef, setIdentity, reset }) {
  return (
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
  );
}

export function CounterLookupForm({ handleFormSubmit, kind, setKind, memberCodeInputRef, query, setQuery, setScanner }) {
  return (
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
    </div>
  );
}
