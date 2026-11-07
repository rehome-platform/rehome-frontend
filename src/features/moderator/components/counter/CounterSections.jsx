import { CounterHandoverTask } from './CounterHandoverTask.jsx';
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../../../components/common/Button.jsx";

import { Status, DetailLink, money } from "../WarehouseUi.jsx";

export function CounterHandoverDialog({ confirmHandover, selected, handoverLoading, setConfirmHandover, executeHandover }) {
  const item = confirmHandover?.item || {};
  const context = confirmHandover?.context || 'ITEM_WITHDRAWAL';
  const targetSku = item.sku || item.productId || item.returnId || '';

  const [skuInput, setSkuInput] = useState('');
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState(false);

  const isSkuMatched = Boolean(targetSku && skuInput.trim().toUpperCase() === targetSku.toUpperCase());
  const canHandover = Boolean(isSkuMatched && isIdentityConfirmed);

  const reasonLabels = {
    ITEM_WITHDRAWAL: 'Member rút hàng',
    END_OF_TERM_TAKE_BACK: 'Nhận lại cuối kỳ',
    INVALID_RETURN_PICKUP: 'Người mua nhận hàng trả',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-card space-y-4 border border-neutral font-sans">
        <div className="flex items-center justify-between border-b border-neutral pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-text font-bold px-2.5 py-0.5">
              {reasonLabels[context] || 'Bàn giao tại quầy'}
            </span>
            <h3 className="text-base font-bold text-[#191C19] mt-1">
              <span className="text-[#5B6776] mr-1">BG-01 ·</span>Xác nhận bàn giao hiện vật tại quầy
            </h3>
          </div>
          <span className="text-xs font-semibold text-[#5B6776]">
            {selected?.memberCode}
          </span>
        </div>

        {/* Thông tin người nhận */}
        <div className="rounded-xl border border-neutral bg-background p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Người nhận:</span>
            <span className="font-bold text-[#191C19]">{selected?.fullName || selected?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Số điện thoại:</span>
            <span className="font-medium text-[#191C19]">{selected?.phone || '09xx xxx xxx'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Sản phẩm:</span>
            <span className="font-bold text-[#006B2C]">{item.productName || item.name || item.productId}</span>
          </div>
        </div>

        {/* Bước 2: Đối chiếu mã SKU */}
        <div className="rounded-xl rounded-xl border-2 border-neutral p-3.5 space-y-2 bg-surface">
          <div className="flex items-center justify-between">
            <label htmlFor="counter-sku-verify" className="text-xs font-bold text-[#191C19] uppercase tracking-wide">
              Nhập mã SKU để đối chiếu
            </label>
            {targetSku && (
              <span className="text-[11px] font-mono text-[#5B6776]">
                SKU cần so khớp: <strong className="text-[#191C19]">{targetSku}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              id="counter-sku-verify"
              type="text"
              placeholder={targetSku ? `Nhập ${targetSku}` : 'Nhập mã SKU...'}
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                skuInput.trim()
                  ? isSkuMatched
                    ? 'border-[#006B2C] bg-[#E8F5E9]/30 text-[#006B2C]'
                    : 'border-[#BA1A1A] bg-[#FFEBEE]/30 text-[#BA1A1A]'
                  : 'border-[#2b2b2b] bg-white text-[#191C19]'
              }`}
            />
            {targetSku && !isSkuMatched && (
              <Button
                type="button"
                variant="outline"
                className="text-xs px-2.5 py-1 whitespace-nowrap"
                onClick={() => setSkuInput(targetSku)}
              >
                Khớp nhanh
              </Button>
            )}
          </div>
          {targetSku && (
            <p className="text-[11px] text-[#5B6776]">
              {isSkuMatched
                ? '✓ Đã đối chiếu khớp mã SKU sản phẩm'
                : 'Vui lòng quét hoặc gõ đúng mã SKU dán trên hiện vật để tránh giao nhầm'}
            </p>
          )}
        </div>

        {/* Bước 3: Xác nhận danh tính */}
        <div className="rounded-xl rounded-xl border border-neutral p-3.5 space-y-2 bg-background">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isIdentityConfirmed}
              onChange={(e) => setIsIdentityConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#8a8a8a] text-[#006B2C] focus:ring-[#006B2C]"
            />
            <span className="text-xs font-bold text-[#191C19] leading-snug">
              Tôi đã hỏi và xác nhận đúng người nhận
            </span>
          </label>
          <p className="text-[11px] text-[#717971] pl-6.5">
            Chưa tích thì nút bàn giao vẫn khoá. Thao tác được ghi nhận vào audit log kèm tài khoản của bạn.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral">
          <span className="text-[11px] text-[#5B6776]">
            {!canHandover ? 'Cần đối chiếu SKU và tích xác nhận để hoàn tất' : 'Sẵn sàng bàn giao'}
          </span>
          <div className="flex gap-2">
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
              disabled={!canHandover}
              className={`font-bold ${
                canHandover
                  ? 'bg-[#006B2C] text-white hover:bg-[#005221]'
                  : 'bg-[#efefef] text-[#9a9a9a] cursor-not-allowed'
              }`}
              onClick={() => executeHandover(confirmHandover.item, confirmHandover.context)}
            >
              Xác nhận đã bàn giao
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CounterWorkflowGuide({ recentServed, reopen, loading }) {
  return (
    <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-3 text-xs font-bold text-[#191C19]">
        Đã phục vụ gần đây
      </div>
      <div className="divide-y divide-[#E2E8E0]">
        {!recentServed.length && (
          <p className="p-3.5 text-xs text-[#717971]">Chưa có Member được phục vụ hôm nay</p>
        )}
        {recentServed.map((item) => (
          <div key={item.memberCode} className="p-3.5 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-[#191C19]">
                {item.name} · {item.memberCode}
              </p>
              <p className="text-[11px] text-[#717971]">{item.taskNote}</p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => reopen(item)}
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
            <Link
              to={`/moderator/consignments/${encodeURIComponent(task.formId)}`}
              state={{ form: task, identified: true }}
            >
              <Button className="bg-[#2b2b2b] text-white hover:bg-black text-xs font-bold px-4 py-2">
                Bắt đầu kiểm định
              </Button>
            </Link>
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

export function CounterIdentityPanel({ selected, results, confirmed, confirmIdentity, reset }) {
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
          <p className="font-bold text-sm text-[#191C19] mt-0.5">{selected.email || '—'}</p>
        </div>
      </div>
    
      <div className="grid grid-cols-3 gap-4 text-xs text-[#5B6776]">
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Tham gia từ</p>
          <p className="font-medium text-[#191C19] mt-0.5">
            {selected.joinedAt
              ? new Date(selected.joinedAt).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Đến kho gần nhất</p>
          <p className="font-medium text-[#191C19] mt-0.5">
            {selected.lastWarehouseVisit
              ? new Date(selected.lastWarehouseVisit).toLocaleDateString('vi-VN')
              : 'Lần đầu đến kho'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Lịch sử</p>
          <p className="font-medium text-[#191C19] mt-0.5">
            {typeof selected.violationSummary === 'object' && selected.violationSummary !== null
              ? (selected.violationSummary.totalViolations > 0
                  ? `${selected.violationSummary.totalViolations} lần vi phạm`
                  : 'Chưa có vi phạm')
              : (selected.violationSummary || 'Chưa có vi phạm')}
          </p>
        </div>
      </div>
    
      <div className="rounded-xl border border-[#8a8a8a] bg-[#fcfdfc] p-4 space-y-2">
        <h3 className="text-xs font-bold text-[#191C19] uppercase tracking-wide">
          Đang ký gửi tại kho này · {selected.activeConsignments?.length || 0} món
        </h3>
        {selected.activeConsignments && selected.activeConsignments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selected.activeConsignments.map((tag, i) => {
              const name = typeof tag === 'object' && tag !== null
                ? (tag.productName || tag.formNo || 'Món ký gửi')
                : tag;
              return (
                <span key={i} className="px-2.5 py-1 rounded border border-[#a8a8a8] bg-white text-xs text-[#414942]">
                  {name}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#717971]">Không có món hàng nào đang ký gửi tại kho này.</p>
        )}
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
          onClick={confirmIdentity}
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
