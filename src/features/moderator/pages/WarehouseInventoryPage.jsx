import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { listItems } from '../models/warehouseModel.js';
import { Page, Field, Status, Pager, ResourceState, money } from '../components/WarehouseUi.jsx';

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

  return (
    <Page
      title="Tồn kho"
      subtitle="Tra SKU, vị trí kệ và trạng thái từ kho đang làm việc."
      actions={
        <div className="flex gap-2">
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
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1">Mã SKU</label>
            <input
              type="text"
              placeholder="VD: RH-A7F31K..."
              value={sku}
              onChange={(e) => change('sku', e.target.value)}
              className="w-full rounded-xl border border-[#8a8a8a] px-3.5 py-2 text-xs font-mono font-bold focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1">Vị trí kệ</label>
            <input
              type="text"
              placeholder="VD: B1-18, B2-04..."
              value={shelf}
              onChange={(e) => change('shelf', e.target.value)}
              className="w-full rounded-xl border border-[#8a8a8a] px-3.5 py-2 text-xs font-bold focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1">Trạng thái tồn kho</label>
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
        <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-xs">
              <thead>
                <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f]">
                  <th className="py-2.5 px-4">Mã SKU</th>
                  <th className="py-2.5 px-4">Sản phẩm / Thương hiệu</th>
                  <th className="py-2.5 px-4">Vị trí kệ</th>
                  <th className="py-2.5 px-4">Giá niêm yết</th>
                  <th className="py-2.5 px-4">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {items.map((item) => (
                  <tr key={item.sku} className="hover:bg-[#fcfdfc] transition-colors">
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
                      <p className="text-[11px] text-[#717971]">{item.brand || 'ReHome'} · Size {item.size || 'M'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#006B2C] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9]">
                        {item.shelfLocation || 'Chưa gán'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#191C19]">
                      {money(item.agreedPrice)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Status>{item.status}</Status>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShelfModal({ item, newShelf: item.shelfLocation || '' })}
                          className="text-xs text-[#006B2C] hover:underline font-semibold"
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
                ))}
              </tbody>
            </table>
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

      {/* Modal Cập nhật vị trí kệ (TK-04) */}
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
              <label className="block text-xs font-bold text-[#191C19] mb-1">
                Vị trí kệ mới
              </label>
              <input
                type="text"
                required
                value={shelfModal.newShelf}
                onChange={(e) => setShelfModal((prev) => ({ ...prev, newShelf: e.target.value }))}
                placeholder="VD: B1-18, A2-05..."
                className="w-full rounded-xl border border-[#8a8a8a] px-3.5 py-2 text-xs font-bold focus:border-[#006B2C] focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-[#5f5f5f] bg-[#f4f5f4] p-2.5 rounded border border-[#d4d4d4] leading-relaxed">
              Nếu vị trí này đã có sản phẩm khác, hệ thống sẽ lưu chung vào cùng một kệ. Hãy kiểm tra nhãn dán trên sản phẩm để tránh nhầm lẫn.
            </p>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1 py-2" onClick={() => setShelfModal(null)}>
                Hủy
              </Button>
              <Button
                type="submit"
                className="flex-1 py-2 bg-[#2b2b2b] text-white hover:bg-black font-bold"
                loading={resource.busy}
                disabled={!shelfModal.newShelf.trim()}
              >
                Lưu vị trí kệ
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
