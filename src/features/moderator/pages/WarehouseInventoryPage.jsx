import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, validateNewShelf } from '../models/warehouseModel.js';
import { Page, Status, Pager, ResourceState, money } from '../components/WarehouseUi.jsx';

export const SUPPORTED_INVENTORY_STATUSES = [
  'ON_SALE',
  'RESERVED',
  'SOLD',
  'WITHDRAWN',
  'UNCLAIMED',
  'DONATED',
  'DESTROYED',
];

export default function WarehouseInventoryPage() {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const [scanner, setScanner] = useState(false);
  const [shelfModal, setShelfModal] = useState(null); // { item, newShelf: '' }
  const [skuLookupModal, setSkuLookupModal] = useState(false);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null); // { type: 'FOUND'|'NOT_FOUND'|'OTHER_WAREHOUSE', data?: any }
  const [isLookingUp, setIsLookingUp] = useState(false);

  const page = Math.max(0, Number(search.get('page')) || 0);
  const sku = search.get('sku') || '';
  const status = search.get('status') || '';
  const shelf = search.get('shelf') || '';

  const resource = useResource(
    (options) => inventoryService.list({ page, sku, status, shelf }, options),
    [page, sku, status, shelf],
  );

  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );

  const items = listItems(resource.data);

  const change = (key, value) =>
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous);
        value ? next.set(key, value) : next.delete(key);
        if (key !== 'page') next.set('page', '0');
        return next;
      },
      { replace: true },
    );

  // Quick status tabs matching TK-01
  const statusTabs = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang bán', value: 'ON_SALE' },
    { label: 'Đang giữ', value: 'RESERVED' },
    { label: 'Đã bán, chờ đóng gói', value: 'SOLD' },
    { label: 'Chờ xử lý cuối kỳ', value: 'WAITING_END_OF_TERM' },
    { label: 'Vô thừa nhận', value: 'UNCLAIMED' },
  ];

  // TK-03 Lookup SKU handler
  const handleLookupSku = async (targetSku) => {
    const code = (targetSku || lookupInput).trim().toUpperCase();
    if (!code) {
      setLookupResult(null);
      return;
    }

    setIsLookingUp(true);
    try {
      // Check in warehouse list first
      const foundInList = items.find((i) => i.sku?.toUpperCase() === code);
      if (foundInList) {
        setLookupResult({ type: 'FOUND', data: foundInList });
        return;
      }

      // Check specific warehouse products or call API
      const res = await inventoryService.read(code).catch((err) => {
        if (err.status === 403 || err.code === 'PRODUCT_NOT_IN_YOUR_WAREHOUSE') {
          return { errorType: 'OTHER_WAREHOUSE', sku: code, warehouseName: 'Kho Thủ Đức' };
        }
        return null;
      });

      if (!res) {
        setLookupResult({ type: 'NOT_FOUND', sku: code });
      } else if (res.errorType === 'OTHER_WAREHOUSE') {
        setLookupResult({ type: 'OTHER_WAREHOUSE', sku: code, warehouseName: res.warehouseName || 'Kho Thủ Đức' });
      } else {
        setLookupResult({ type: 'FOUND', data: res });
      }
    } catch {
      setLookupResult({ type: 'NOT_FOUND', sku: code });
    } finally {
      setIsLookingUp(false);
    }
  };

  // Check conflicting shelf for TK-04
  const conflictingItem = useMemo(() => {
    if (!shelfModal?.newShelf?.trim()) return null;
    const target = shelfModal.newShelf.trim().toUpperCase();
    return items.find(
      (it) =>
        it.sku !== shelfModal.item.sku &&
        it.shelfLocation?.trim().toUpperCase() === target
    );
  }, [shelfModal, items]);

  return (
    <Page
      title={
        <div className="flex items-baseline gap-3">
          <span>Tồn kho</span>
          <span className="text-xs font-normal text-[#5f5f5f]">
            · {resource.data?.totalElements || items.length} món lưu tại kho
          </span>
        </div>
      }
      subtitle="Chỉ hàng trong kho đang làm việc. Moderator không xem được kho khác."
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSkuLookupModal(true);
              setLookupResult(null);
              setLookupInput('');
            }}
            className="text-xs font-bold border-[#2b2b2b] text-[#2b2b2b]"
          >
            Tra cứu SKU (TK-03)
          </Button>
          <Button variant="outline" onClick={() => setScanner(true)}>
            Quét QR SKU
          </Button>
          <Button variant="outline" onClick={resource.refresh}>
            Tải lại
          </Button>
        </div>
      }
    >
      {/* 1. KHUNG TÌM KIẾM & BỘ LỌC (TK-01) */}
      <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-4">
        {/* Hàng Tab Trạng Thái Nhanh Chuẩn TK-01 */}
        <div className="flex flex-wrap gap-2 pb-3 border-b border-[#ececec]">
          {statusTabs.map((tab) => {
            const isActive = (status || '') === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => change('status', tab.value)}
                className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#2b2b2b] text-white border-[#2b2b2b]'
                    : 'bg-white text-[#4a4a4a] border-[#a8a8a8] hover:bg-[#f4f4f4]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#191C19]">Mã SKU hoặc tên</label>
              {sku.trim() && (
                <button
                  type="button"
                  onClick={() => navigate(`/moderator/inventory/${encodeURIComponent(sku.trim())}`)}
                  className="text-[11px] text-[#006B2C] font-semibold hover:underline"
                >
                  Mở chi tiết SKU →
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="VD: RH-M4T19B, RH-C2M08P..."
              value={sku}
              onChange={(e) => change('sku', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sku.trim()) {
                  e.preventDefault();
                  navigate(`/moderator/inventory/${encodeURIComponent(sku.trim())}`);
                }
              }}
              className="w-full rounded-xl border border-[#8a8a8a] px-3.5 py-2 text-xs font-mono font-bold focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1">Vị trí kệ</label>
            <input
              type="text"
              placeholder="VD: B1-18, C2-11..."
              value={shelf}
              onChange={(e) => change('shelf', e.target.value)}
              className="w-full rounded-xl border border-[#8a8a8a] px-3.5 py-2 text-xs font-bold focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1">Lọc theo trạng thái</label>
            <select
              className="w-full rounded-xl border border-[#8a8a8a] bg-white px-3.5 py-2 text-xs font-semibold focus:border-[#006B2C] focus:outline-none"
              value={status}
              onChange={(e) => change('status', e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {(Array.isArray(enums.data?.inventoryStatuses) && enums.data.inventoryStatuses.length > 0
                ? enums.data.inventoryStatuses.filter((s) => SUPPORTED_INVENTORY_STATUSES.includes(s))
                : SUPPORTED_INVENTORY_STATUSES
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ResourceState resource={resource} empty={!items.length} />

      {/* 2. BẢNG TỒN KHO CHUẨN WIREFRAME (TK-01) */}
      {!!items.length && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f]">
                    <th className="py-2.5 px-4 w-32">Mã SKU</th>
                    <th className="py-2.5 px-4">Sản phẩm</th>
                    <th className="py-2.5 px-4 w-24">Kệ</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                    <th className="py-2.5 px-4">Kỳ ký gửi</th>
                    <th className="py-2.5 px-4 text-right">Giá bán</th>
                    <th className="py-2.5 px-4 text-right w-40">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {items.map((item) => {
                    const isActionNeeded =
                      item.status === 'WAITING_END_OF_TERM' ||
                      item.status === 'UNCLAIMED' ||
                      item.decision;

                    return (
                      <tr
                        key={item.sku}
                        className={`transition-colors ${
                          isActionNeeded
                            ? 'bg-[#f8f9fa] border-l-4 border-l-[#2b2b2b]'
                            : 'hover:bg-[#fcfdfc]'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#191C19]">
                          <Link
                            className="text-primary hover:underline"
                            to={`/moderator/inventory/${encodeURIComponent(item.sku)}`}
                          >
                            {item.sku}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#191C19]">{item.name}</p>
                          <p className="text-[11px] text-[#717971]">
                            {item.brandName || item.brand || 'ReHome'}
                            {item.size ? ` · Size ${item.size}` : ''}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#006B2C] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9] font-mono">
                            {item.shelfLocation || 'Chưa gán'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.status === 'WAITING_END_OF_TERM' ? (
                            <span className="font-bold text-[#2b2b2b]">Chờ xử lý cuối kỳ</span>
                          ) : item.status === 'UNCLAIMED' ? (
                            <span className="font-bold text-red-700">Vô thừa nhận</span>
                          ) : (
                            <Status>{item.status}</Status>
                          )}
                          {item.decision === 'RE_CONSIGN' && (
                            <span className="block text-[10px] text-[#006B2C] font-semibold mt-0.5">
                              Member yêu cầu ký gửi lại
                            </span>
                          )}
                          {item.decision === 'TAKE_BACK' && (
                            <span className="block text-[10px] text-amber-800 font-semibold mt-0.5">
                              Khách yêu cầu nhận lại
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#5f5f5f]">
                          {item.currentTerm ? `Kỳ ${item.currentTerm} · ngày ${item.daysIntoTerm || 1}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#191C19] text-right">
                          {item.currentPrice || item.agreedPrice ? money(item.currentPrice || item.agreedPrice) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {(item.decision === 'RE_CONSIGN' || item.status === 'WAITING_END_OF_TERM') && (
                              <Link
                                to={`/moderator/inventory/${encodeURIComponent(item.sku)}/re-consign`}
                                className="text-xs font-bold text-[#006B2C] hover:underline bg-[#E8F5E9] px-2 py-1 rounded border border-[#C8E6C9]"
                              >
                                Đàm phán giá →
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => setShelfModal({ item, newShelf: item.shelfLocation || '' })}
                              className="text-xs text-[#4a4a4a] hover:underline font-semibold"
                            >
                              Đổi kệ
                            </button>
                            <Link
                              className="text-xs text-primary hover:underline font-semibold"
                              to={`/moderator/inventory/${encodeURIComponent(item.sku)}`}
                            >
                              Chi tiết →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ghi chú wireframe TK-01 số 2 */}
          <div className="p-3.5 rounded-xl border border-dashed border-[#9a9a9a] bg-[#fafafa] text-xs text-[#4a4a4a] leading-relaxed">
            Các dòng viền đậm là món <strong className="text-[#191C19]">cần người xử lý</strong>: hết kỳ chờ Member quyết định, hoặc đã quá 30 ngày thành vô thừa nhận. Chúng nằm chung bảng chứ không tách tab riêng để Moderator nhìn một lần thấy hết.
          </div>
        </div>
      )}

      {/* Phân trang */}
      {!!resource.data && resource.data.totalPages > 1 && (
        <Pager
          page={page}
          totalPages={resource.data.totalPages}
          onChange={(value) => change('page', String(value))}
        />
      )}

      {/* MODAL TRA CỨU SKU CHUẨN WIREFRAME (TK-03) */}
      <Modal
        isOpen={skuLookupModal}
        title="Tra cứu sản phẩm bằng mã SKU (TK-03)"
        onClose={() => setSkuLookupModal(false)}
        maxWidth="max-w-xl"
      >
        <div className="space-y-5 text-xs text-[#2b2b2b]">
          <div className="space-y-1">
            <label htmlFor="sku-lookup-input" className="block text-xs font-bold text-[#191C19]">
              Nhập mã SKU trên tem
            </label>
            <p className="text-[11px] text-[#5f5f5f]">
              Đọc mã trên tem dán ở sản phẩm. Không quét QR — kho đã bỏ quét mã (quyết định 11/10).
            </p>
            <div className="flex gap-2 pt-2">
              <input
                id="sku-lookup-input"
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupSku()}
                placeholder="VD: RH-K9B47T, RH-M4T19B, RH-D6P23L..."
                className="flex-1 rounded-xl border-2 border-[#2b2b2b] px-3.5 py-2.5 text-base font-bold font-mono focus:outline-none focus:border-[#006B2C]"
              />
              <Button
                onClick={() => handleLookupSku()}
                loading={isLookingUp}
                className="bg-[#2b2b2b] text-white hover:bg-black font-bold px-5"
              >
                Tra cứu
              </Button>
            </div>
          </div>

          {/* HIỂN THỊ KẾT QUẢ THEO 4 TRẠNG THÁI WIREFRAME TK-03 */}
          {!lookupResult && (
            /* TK-03-ChoNhap */
            <div className="p-6 border border-dashed border-[#c4c4c4] rounded-xl text-center space-y-1 text-[#7a7a7a]">
              <div className="font-bold text-sm text-[#5f5f5f]">Chưa có kết quả (TK-03-ChoNhap)</div>
              <p className="text-[11px]">Nhập đủ mã SKU rồi bấm Tra cứu, hoặc Enter.</p>
            </div>
          )}

          {lookupResult?.type === 'FOUND' && (
            /* TK-03-TimThay */
            <div className="border-2 border-[#2b2b2b] p-4 rounded-xl bg-white space-y-3">
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 bg-[#2b2b2b] text-white rounded">
                TÌM THẤY (TK-03-TimThay)
              </span>
              <div className="flex gap-4 items-start pt-2">
                <div className="w-16 h-16 rounded-lg border border-[#c4c4c4] bg-[#f9f9f9] flex items-center justify-center font-bold text-xs text-[#8a8a8a]">
                  Ảnh
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-bold text-sm text-[#191C19]">{lookupResult.data.name}</h4>
                  <p className="text-[11px] text-[#5f5f5f]">
                    {lookupResult.data.brandName || lookupResult.data.brand || 'ReHome'} · Size {lookupResult.data.size || 'M'}
                  </p>
                  <p className="text-[11px] text-[#5f5f5f]">
                    Kệ: <strong className="font-mono text-[#006B2C]">{lookupResult.data.shelfLocation || 'Chưa gán'}</strong> · Trạng thái: <Status>{lookupResult.data.status}</Status>
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSkuLookupModal(false);
                  navigate(`/moderator/inventory/${encodeURIComponent(lookupResult.data.sku)}`);
                }}
                className="w-full py-2.5 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs rounded-xl"
              >
                Mở chi tiết sản phẩm (TK-02) →
              </Button>
            </div>
          )}

          {lookupResult?.type === 'OTHER_WAREHOUSE' && (
            /* TK-03-KhongThuocKho */
            <div className="border-2 border-[#2b2b2b] p-4 rounded-xl bg-white space-y-2">
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 border border-[#2b2b2b] text-[#2b2b2b] rounded">
                THUỘC KHO KHÁC (TK-03-KhongThuocKho)
              </span>
              <h4 className="font-bold text-sm text-[#191C19] pt-1">
                {lookupResult.sku} không ở kho này
              </h4>
              <p className="text-xs text-[#4a4a4a] leading-relaxed">
                Mã này thuộc <strong>{lookupResult.warehouseName}</strong>. Mỗi kho chỉ xem và xử lý hàng trong kho của mình — không mở được chi tiết từ đây.
              </p>
            </div>
          )}

          {lookupResult?.type === 'NOT_FOUND' && (
            /* TK-03-KhongTonTai */
            <div className="border-2 border-dashed border-[#8a8a8a] p-4 rounded-xl bg-white space-y-2">
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 border border-[#8a8a8a] text-[#4a4a4a] rounded">
                KHÔNG TỒN TẠI (TK-03-KhongTonTai)
              </span>
              <h4 className="font-bold text-sm text-[#191C19] pt-1">
                Không tìm thấy mã SKU này
              </h4>
              <p className="text-xs text-[#4a4a4a] leading-relaxed">
                Kiểm tra lại đã gõ đúng mã trên tem chưa. Mã SKU bỏ chữ I, O và số 0, 1 để tránh đọc nhầm.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL CẬP NHẬT VỊ TRÍ KỆ (TK-04) - CÓ KIỂM TRA TRÙNG KỆ */}
      <Modal
        isOpen={!!shelfModal}
        title="Cập nhật vị trí kệ kho (TK-04)"
        onClose={() => setShelfModal(null)}
      >
        {shelfModal && (
          <form
            className="space-y-4 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              resource.mutate(
                (opts) => inventoryService.shelf(shelfModal.item.sku, shelfModal.newShelf.trim(), opts),
                {
                  onSuccess: () => {
                    setShelfModal(null);
                    resource.refresh();
                  },
                },
              );
            }}
          >
            <div className="p-3 rounded-xl border border-[#c4c4c4] bg-[#fafafa]">
              <p className="font-bold text-sm text-[#191C19]">{shelfModal.item.name}</p>
              <p className="font-mono text-[#5f5f5f] mt-0.5">SKU: {shelfModal.item.sku}</p>
              <p className="text-[11px] text-[#717971] mt-1">
                Vị trí hiện tại: <strong>{shelfModal.item.shelfLocation || 'Chưa gán kệ'}</strong>
              </p>
            </div>

            <div>
              <label htmlFor="modal-new-shelf" className="block text-xs font-bold text-[#191C19] mb-1">
                Vị trí kệ mới
              </label>
              <input
                id="modal-new-shelf"
                type="text"
                required
                value={shelfModal.newShelf}
                onChange={(e) => setShelfModal((prev) => ({ ...prev, newShelf: e.target.value }))}
                placeholder="VD: B1-18, A3-07..."
                className={`w-full rounded-xl border px-3.5 py-2 text-xs font-bold focus:outline-none ${
                  shelfModal.newShelf.trim() && !validateNewShelf(shelfModal.newShelf, shelfModal.item.shelfLocation).valid
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-[#8a8a8a] focus:border-[#006B2C]'
                }`}
              />
              {shelfModal.newShelf.trim() && !validateNewShelf(shelfModal.newShelf, shelfModal.item.shelfLocation).valid && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">
                  {validateNewShelf(shelfModal.newShelf, shelfModal.item.shelfLocation).message}
                </p>
              )}
            </div>

            {/* CẢNH BÁO TRÙNG KỆ THEO WIREFRAME TK-04-CapNhatKe-TrungKe */}
            {conflictingItem && (
              <div className="p-3 bg-[#fff7ed] border border-[#ea580c] rounded-xl text-xs text-[#9a3412] font-semibold leading-relaxed">
                ⚠️ Kệ <strong>{shelfModal.newShelf.trim()}</strong> hiện đang chứa{' '}
                <strong>{conflictingItem.sku}</strong> ({conflictingItem.name}). Xác nhận vẫn đổi thì hai mã SKU cùng ghi một vị trí — nên chọn kệ khác hoặc dời món cũ trước.
              </div>
            )}

            {!conflictingItem && (
              <p className="text-[11px] text-[#5f5f5f] bg-[#f4f5f4] p-2.5 rounded border border-[#d4d4d4] leading-relaxed">
                Nếu vị trí này đã có sản phẩm khác, hệ thống sẽ lưu chung vào cùng một kệ. Hãy kiểm tra nhãn dán trên sản phẩm để tránh nhầm lẫn.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1 py-2" onClick={() => setShelfModal(null)}>
                Hủy
              </Button>
              <Button
                type="submit"
                className={`flex-1 py-2 font-bold ${
                  conflictingItem
                    ? 'border-2 border-[#2b2b2b] bg-white text-[#2b2b2b] hover:bg-black hover:text-white'
                    : 'bg-[#2b2b2b] text-white hover:bg-black'
                }`}
                loading={resource.busy}
                disabled={!validateNewShelf(shelfModal.newShelf, shelfModal.item.shelfLocation).valid}
              >
                {conflictingItem ? 'Vẫn đổi, chấp nhận trùng kệ' : 'Lưu vị trí kệ'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Quét QR SKU */}
      <QRScannerModal
        isOpen={scanner}
        onClose={() => setScanner(false)}
        title="Quét QR SKU sản phẩm"
        placeholder="Nhập SKU sản phẩm"
        onScanSuccess={(value) => {
          setScanner(false);
          navigate(`/moderator/inventory/${encodeURIComponent(value)}`);
        }}
      />
    </Page>
  );
}
