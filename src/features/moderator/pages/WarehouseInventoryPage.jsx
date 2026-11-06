import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { listItems } from '../models/warehouseModel.js';
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

export const INVENTORY_STATUS_LABELS = {
  ON_SALE: 'Đang bán',
  RESERVED: 'Đang giữ',
  SOLD: 'Đã bán, chờ đóng gói',
  WAITING_END_OF_TERM: 'Chờ xử lý cuối kỳ',
  WITHDRAWN: 'Đã rút hàng',
  UNCLAIMED: 'Vô thừa nhận',
  DONATED: 'Đã chuyển giao từ thiện',
  DESTROYED: 'Đã tiêu huỷ',
  RETURNED: 'Đã hoàn trả',
};

export default function WarehouseInventoryPage() {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const [scanner, setScanner] = useState(false);
  const [skuLookupModal, setSkuLookupModal] = useState(false);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null); // { type: 'FOUND'|'NOT_FOUND'|'OTHER_WAREHOUSE', data?: any }
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [degradedModalItem, setDegradedModalItem] = useState(null);

  const page = Math.max(0, Number(search.get('page')) || 0);
  const sku = search.get('sku') || '';
  const status = search.get('status') || '';

  const resource = useResource(
    async (options) => {
      if (status === 'DEGRADED') {
        const degradedList = await inventoryService.degradedCases({ status: '' }, options);
        return {
          content: (degradedList || []).map((c) => ({
            sku: c.productId || c.id,
            id: c.id,
            productId: c.productId,
            name: c.productName || 'Sản phẩm ký gửi',
            brandName: 'ReHome',
            degradedDate: c.receivedAt,
            degradedReason: c.reason || c.moderatorNote || 'Hàng xuống cấp sau khi trả về',
            conditionNote: c.moderatorNote,
            decisionStatus: c.decision || (c.status === 'DECIDED' ? 'FULL_COMPENSATION' : 'PENDING'),
            decisionStatusLabel:
              c.decision === 'FULL_COMPENSATION'
                ? 'Đã đền 100%'
                : c.decision === 'PARTIAL_WITH_ITEM_BACK'
                ? 'Đền 50% + nhận lại'
                : 'Chờ Member chọn',
            compensationAmount: c.compensationAmount,
            paidAmount: c.paidAmount,
            photos: c.photos || [],
          })),
          totalElements: (degradedList || []).length,
          totalPages: 1,
        };
      }
      return inventoryService.list({ page, sku, status }, options);
    },
    [page, sku, status],
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
    { label: 'Hàng xuống cấp', value: 'DEGRADED' },
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
            Tra cứu SKU
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
                className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-colors ${isActive
                  ? 'bg-[#006B2C] text-white border-[#006B2C]'
                  : 'bg-white text-[#4a4a4a] border-[#a8a8a8] hover:bg-[#F0F5EE]'
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
            <label className="block text-xs font-bold text-[#191C19] mb-1">Lọc theo trạng thái</label>
            <select
              className="w-full rounded-xl border border-[#8a8a8a] bg-white px-3.5 py-2 text-xs font-semibold focus:border-[#006B2C] focus:outline-none"
              value={status}
              onChange={(e) => change('status', e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {Array.from(
                new Set([
                  ...SUPPORTED_INVENTORY_STATUSES,
                  ...(Array.isArray(enums.data?.inventoryStatuses) ? enums.data.inventoryStatuses : []),
                ])
              ).map((value) => (
                <option key={value} value={value}>
                  {INVENTORY_STATUS_LABELS[value] || value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ResourceState resource={resource} empty={!items.length} />

      {/* 2. BẢNG TỒN KHO / BẢNG HÀNG XUỐNG CẤP CHUYÊN BIỆT */}
      {!!items.length && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {status === 'DEGRADED' ? (
                <table className="min-w-[760px] w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FFF8E1] border-b border-[#FFE082] text-[10px] font-bold uppercase tracking-wider text-[#B78103]">
                      <th className="py-3 px-4 w-32">Mã SKU</th>
                      <th className="py-3 px-4">Sản phẩm</th>
                      <th className="py-3 px-4 w-28">Ngày báo</th>
                      <th className="py-3 px-4">Lý do xuống cấp</th>
                      <th className="py-3 px-4">Trạng thái đền bù</th>
                      <th className="py-3 px-4 text-right w-44">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {items.map((item) => (
                      <tr key={item.sku || item.id} className="hover:bg-[#FFFDF5] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#191C19]">
                          {item.sku || item.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#191C19]">{item.name}</p>
                          <p className="text-[11px] text-[#717971]">
                            {item.brandName || item.brand || 'ReHome'}
                            {item.size ? ` · Size ${item.size}` : ''}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-[#5f5f5f]">
                          {item.degradedDate ? new Date(item.degradedDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate" title={item.degradedReason || item.conditionNote}>
                          <span className="font-medium text-[#191C19]">
                            {item.degradedReason || item.conditionNote || 'Hàng trả về có dấu hiệu xuống cấp'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${
                            item.decisionStatus === 'FULL_COMPENSATION'
                              ? 'bg-[#E8F5E9] text-[#006B2C]'
                              : item.decisionStatus === 'PARTIAL_COMPENSATION'
                              ? 'bg-[#E3F2FD] text-[#1565C0]'
                              : 'bg-[#FFF3E0] text-[#E65100]'
                          }`}>
                            {item.decisionStatusLabel || (item.decisionStatus === 'FULL_COMPENSATION' ? 'Đã đền 100%' : item.decisionStatus === 'PARTIAL_COMPENSATION' ? 'Đền 50% + nhận lại' : 'Chờ Member chọn')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            className="text-xs py-1 px-3 border-[#006B2C] text-[#006B2C] hover:bg-[#E8F5E9] font-semibold"
                            onClick={() => setDegradedModalItem(item)}
                          >
                            Xem biên bản & ảnh →
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-[760px] w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f]">
                      <th className="py-2.5 px-4 w-32">Mã SKU</th>
                      <th className="py-2.5 px-4">Sản phẩm</th>
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
                          className={`transition-colors ${isActionNeeded
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
              )}
            </div>
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
        title="Tra cứu sản phẩm bằng mã SKU"
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
                className="flex-1 rounded-xl border border-neutral px-3.5 py-2 text-sm font-bold font-mono focus:outline-none focus:border-[#006B2C]"
              />
              <Button
                variant="primary"
                onClick={() => handleLookupSku()}
                loading={isLookingUp}
                className="font-semibold px-5 text-sm"
              >
                Tra cứu
              </Button>
            </div>
          </div>

          {/* HIỂN THỊ KẾT QUẢ THEO 4 TRẠNG THÁI WIREFRAME TK-03 */}
          {!lookupResult && (
            /* TK-03-ChoNhap */
            <div className="p-6 border border-dashed border-[#c4c4c4] rounded-xl text-center space-y-1 text-[#7a7a7a]">
              <div className="font-bold text-sm text-[#5f5f5f]">Chưa có kết quả</div>
              <p className="text-[11px]">Nhập đủ mã SKU rồi bấm Tra cứu, hoặc Enter.</p>
            </div>
          )}

          {lookupResult?.type === 'FOUND' && (
            /* TK-03-TimThay */
            <div className="border border-neutral p-4 rounded-xl bg-white space-y-3">
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 bg-[#006B2C] text-white rounded">
                TÌM THẤY
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
                    Trạng thái: <Status>{lookupResult.data.status}</Status>
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setSkuLookupModal(false);
                  navigate(`/moderator/inventory/${encodeURIComponent(lookupResult.data.sku)}`);
                }}
                className="w-full py-2 text-sm font-semibold rounded-xl"
              >
                Mở chi tiết sản phẩm →
              </Button>
            </div>
          )}

          {lookupResult?.type === 'OTHER_WAREHOUSE' && (
            /* TK-03-KhongThuocKho */
            <div className="border-2 border-[#2b2b2b] p-4 rounded-xl bg-white space-y-2">
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 border border-[#2b2b2b] text-[#2b2b2b] rounded">
                THUỘC KHO KHÁC
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
                KHÔNG TỒN TẠI
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

      {/* MODAL XEM BIÊN BẢN & ẢNH HÀNG XUỐNG CẤP (Decision 1) */}
      {degradedModalItem && (
        <Modal
          isOpen={!!degradedModalItem}
          onClose={() => setDegradedModalItem(null)}
          title={`Biên bản hàng xuống cấp · SKU ${degradedModalItem.sku || degradedModalItem.id}`}
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-xl border border-neutral bg-[#f9faf9] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#5f5f5f]">Sản phẩm:</span>
                <span className="font-bold text-[#191C19]">
                  {degradedModalItem.name} ({degradedModalItem.brandName || degradedModalItem.brand || '—'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f5f5f]">Người ký gửi:</span>
                <span className="font-semibold text-[#191C19]">{degradedModalItem.memberName || 'Member ký gửi'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f5f5f]">Ngày lập biên bản:</span>
                <span className="text-[#191C19]">
                  {degradedModalItem.degradedDate ? new Date(degradedModalItem.degradedDate).toLocaleString('vi-VN') : 'Gần đây'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f5f5f]">Trạng thái quyết định:</span>
                <span className="font-bold text-[#006B2C]">
                  {degradedModalItem.decisionStatusLabel || (degradedModalItem.decisionStatus === 'FULL_COMPENSATION' ? 'Đã đền 100%' : 'Chờ Member chọn')}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-[#5f5f5f]">Mô tả lý do xuống cấp</span>
              <p className="p-3 rounded-xl border border-[#d4d4d4] bg-white text-[#191C19] leading-relaxed">
                {degradedModalItem.degradedReason || degradedModalItem.conditionNote || 'Hàng trả về có vết bẩn khó tẩy, rách chỉ hoặc xơ vải so với thời điểm nhập kho ban đầu.'}
              </p>
            </div>

            {/* Mức tiền đền tự động */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-[#006B2C] bg-[#E8F5E9]/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#006B2C]">Phương án 1 · Đền đủ 100%</span>
                <p className="text-base font-extrabold text-[#006B2C]">
                  {money(degradedModalItem.compensationAmount || degradedModalItem.agreedPrice || 320000)}
                </p>
                <p className="text-[10px] text-[#5f5f5f]">Hàng thành tài sản nền tảng, Member nhận đủ tiền đền vào ví.</p>
              </div>
              <div className="p-3 rounded-xl border border-[#D97706] bg-[#FFFBEB] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#D97706]">Phương án 2 · Đền 50% + Nhận lại</span>
                <p className="text-base font-extrabold text-[#D97706]">
                  {money(degradedModalItem.halfCompensationAmount || Math.round((degradedModalItem.compensationAmount || degradedModalItem.agreedPrice || 320000) * 0.5))}
                </p>
                <p className="text-[10px] text-[#5f5f5f]">Member nhận 50% tiền đền vào ví và có 30 ngày đến kho nhận lại đồ.</p>
              </div>
            </div>

            {/* Ảnh chụp đối chiếu */}
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-[#5f5f5f]">Ảnh chụp thực tế & Ảnh nhập kho</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-center">
                  <span className="text-[10px] text-[#5f5f5f] font-semibold">Ảnh lúc nhập kho ban đầu</span>
                  <div className="h-36 rounded-xl border border-[#d4d4d4] overflow-hidden bg-[#fafafa] flex items-center justify-center">
                    <img
                      src={degradedModalItem.stockInPhotos?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300'}
                      alt="Ảnh nhập kho"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <span className="text-[10px] text-red-600 font-semibold">Ảnh hiện trạng xuống cấp</span>
                  <div className="h-36 rounded-xl border border-[#d4d4d4] overflow-hidden bg-[#fafafa] flex items-center justify-center">
                    <img
                      src={degradedModalItem.returnPhotos?.[0] || 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=300'}
                      alt="Ảnh hoàn về"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => setDegradedModalItem(null)}
                className="px-4 py-2 text-sm font-semibold"
              >
                Đóng biên bản
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
