import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import CatalogEditor from '../components/CatalogEditor.jsx';
import { catalogService } from '../services/warehouseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { Page, ResourceState } from '../components/WarehouseUi.jsx';
import { filterCatalogItems, formatTryOnSlot } from '../models/warehouseModel.js';
import { TABLE_COLUMN_LABELS } from '../../../constants/tableColumns.js';
import { useToast } from '../../../context/ToastContext.jsx';

export default function CategoryBrandPage() {
  const toast = useToast();
  const [search, setSearch] = useSearchParams();
  const kind = search.get('tab') === 'brands' ? 'brand' : 'category';
  const isCategory = kind === 'category';

  const [keyword, setKeyword] = useState('');
  const [slotFilter, setSlotFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editor, setEditor] = useState(null);
  const [hiding, setHiding] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const resource = useResource((options) => catalogService.list(options), []);
  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );

  const categories = resource.data?.categories || [];
  const brands = resource.data?.brands || [];
  const rawItems = isCategory ? categories : brands;

  // Lọc đa chiều: từ khóa tìm kiếm + slot thử đồ + trạng thái (DM-01) + mới nhất lên đầu
  const items = useMemo(() => {
    let result = rawItems;
    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      result = result.filter((item) => (item.name || '').toLowerCase().includes(q));
    }
    if (isCategory && slotFilter !== 'ALL') {
      result = result.filter((item) => {
        const slot = item.slot || item.tryonSlot || 'NONE';
        return slot === slotFilter;
      });
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((item) => {
        const isHidden = !!item.hidden || item.status === 'HIDDEN';
        return statusFilter === 'HIDDEN' ? isHidden : !isHidden;
      });
    }
    return [...result].sort((a, b) => {
      const rawA = a?.createdAt || a?.updatedAt;
      const rawB = b?.createdAt || b?.updatedAt;
      const tA = rawA ? Date.parse(rawA) : NaN;
      const tB = rawB ? Date.parse(rawB) : NaN;
      if (Number.isFinite(tA) && Number.isFinite(tB)) return tB - tA;
      if (Number.isFinite(tB)) return 1;
      if (Number.isFinite(tA)) return -1;
      return 0;
    });
  }, [rawItems, keyword, slotFilter, statusFilter, isCategory]);

  const handleUnhide = (item) => {
    resource.mutate(
      (opts) =>
        catalogService.save(
          kind,
          item.id,
          {
            name: item.name,
            tryonSlot: item.slot || item.tryonSlot || 'TOP',
            slot: item.slot || item.tryonSlot || 'TOP',
            status: 'ACTIVE',
          },
          opts,
        ),
      {
        onSuccess: () => {
          toast.success(`Đã kích hoạt lại ${isCategory ? 'danh mục' : 'thương hiệu'} "${item.name}".`);
          resource.refresh();
        },
      },
    );
  };

  const handleHideConfirm = () => {
    if (!hiding) return;
    resource.mutate(
      (options) => catalogService.hide(hiding.kind, hiding.item.id, options),
      {
        onSuccess: () => {
          toast.success(`Đã ẩn ${hiding.kind === 'category' ? 'danh mục' : 'thương hiệu'} "${hiding.item.name}".`);
          setHiding(null);
          resource.refresh();
        },
      },
    );
  };

  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    const target = deleting;
    const label = target.kind === 'category' ? 'danh mục' : 'thương hiệu';
    try {
      await catalogService.delete(target.kind, target.item.id);
      toast.success(`Đã xóa vĩnh viễn ${label} "${target.item.name}" thành công.`);
      setDeleting(null);
      resource.refresh();
    } catch (err) {
      const isConflict =
        err.status === 409 ||
        err.response?.status === 409 ||
        err.code === 'CATEGORY_HAS_PRODUCTS' ||
        err.code === 'BRAND_HAS_PRODUCTS' ||
        String(err.message || '').includes('CATEGORY_HAS_PRODUCTS') ||
        String(err.message || '').includes('BRAND_HAS_PRODUCTS');

      if (isConflict) {
        try {
          await catalogService.hide(target.kind, target.item.id);
          toast.warn(
            `"${target.item.name}" đã có sản phẩm tham chiếu trong lịch sử. Hệ thống đã tự động chuyển sang chế độ Ẩn để bảo toàn dữ liệu (theo F-145).`
          );
          setDeleting(null);
          resource.refresh();
        } catch (hideErr) {
          toast.error(hideErr.message || `Không thể ẩn ${label}.`);
        }
      } else {
        toast.error(err.message || `Có lỗi xảy ra khi xóa ${label}.`);
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Page
      title="Danh mục & thương hiệu"
      subtitle="Quản lý cấu hình danh mục sản phẩm, slot thử đồ AI và thương hiệu ký gửi tại kho."
      actions={
        <Button
          variant="primary"
          size="md"
          onClick={() => setEditor({ kind, item: null })}
        >
          + Thêm {isCategory ? 'danh mục mới' : 'thương hiệu mới'}
        </Button>
      }
    >
      {/* Banner thông báo kết quả */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium border ${feedback.type === 'success'
              ? 'bg-[#E8F5E9] text-[#006B2C] border-[#C8E6C9]'
              : 'bg-[#FFEBEE] text-[#BA1A1A] border-[#FFCDD2]'
            }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold px-2 py-0.5 hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. TABS CHUYỂN ĐỔI KÈM SỐ LƯỢNG & BỘ LỌC ĐA TIÊU CHÍ (DM-01) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setKeyword('');
                setSlotFilter('ALL');
                setStatusFilter('ALL');
                setSearch({ tab: 'categories' });
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isCategory
                  ? 'border-[#006B2C] bg-[#006B2C] text-white shadow-sm'
                  : 'border-neutral bg-white text-textSecondary hover:bg-[#F6F9F4]'
                }`}
            >
              Danh mục · {categories.length}
            </button>
            <button
              type="button"
              onClick={() => {
                setKeyword('');
                setSlotFilter('ALL');
                setStatusFilter('ALL');
                setSearch({ tab: 'brands' });
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${!isCategory
                  ? 'border-[#006B2C] bg-[#006B2C] text-white shadow-sm'
                  : 'border-neutral bg-white text-textSecondary hover:bg-[#F6F9F4]'
                }`}
            >
              Thương hiệu · {brands.length}
            </button>
          </div>

          {/* Ô tìm kiếm nhanh */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={`Tìm ${isCategory ? 'danh mục' : 'thương hiệu'}...`}
              className="w-full rounded-xl border-[#8a8a8a] text-xs py-2 pl-3 pr-8 focus:border-[#2b2b2b] focus:ring-1 focus:ring-[#2b2b2b]"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#7a7a7a] hover:text-black font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Thanh bộ lọc đa tiêu chí (DM-01) */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          {isCategory && (
            <div className="flex items-center gap-1.5 text-xs text-[#5B6776]">
              <label htmlFor="category-slot-filter" className="font-semibold text-[#191C19]">
                Slot thử đồ AI:
              </label>
              <select
                id="category-slot-filter"
                aria-label="Lọc slot thử đồ"
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value)}
                className="rounded-xl border border-neutral bg-white px-2.5 py-1.5 text-xs font-semibold text-text focus:border-[#006B2C] focus:outline-none"
              >
                <option value="ALL">Tất cả slot</option>
                <option value="TOP">Áo</option>
                <option value="BOTTOM">Quần / Váy</option>
                <option value="DRESS">Đầm / Liền thân</option>
                <option value="NONE">Không có slot</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-textSecondary">
            <label htmlFor="category-status-filter" className="font-semibold text-text">
              Trạng thái:
            </label>
            <select
              id="category-status-filter"
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral bg-white px-2.5 py-1.5 text-xs font-semibold text-text focus:border-[#006B2C] focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiện</option>
              <option value="HIDDEN">Đã ẩn</option>
            </select>
          </div>

          {(keyword || slotFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setKeyword('');
                setSlotFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs font-bold text-primary hover:underline ml-auto"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      <ResourceState resource={resource} empty={!items.length && !keyword} />

      {/* Empty search results state */}
      {!items.length && !!keyword && (
        <div className="rounded-2xl border border-dashed border-[#8a8a8a] bg-white p-8 text-center text-xs text-[#5f5f5f]">
          Không tìm thấy {isCategory ? 'danh mục' : 'thương hiệu'} nào khớp với từ khóa "<strong>{keyword}</strong>".
          <button
            type="button"
            onClick={() => setKeyword('')}
            className="block mx-auto mt-2 text-primary font-bold underline"
          >
            Xóa tìm kiếm
          </button>
        </div>
      )}

      {/* 2. BẢNG DỮ LIỆU CHUẨN WIREFRAME (DM-01) */}
      {!!items.length && (
        <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-xs font-semibold text-[#5f5f5f] whitespace-nowrap">
                  <th className="py-2.5 px-4">{isCategory ? 'Danh mục' : 'Thương hiệu'}</th>
                  {isCategory && <th className="py-2.5 px-4">Slot thử đồ AI</th>}
                  <th className="py-2.5 px-4">{TABLE_COLUMN_LABELS.STATUS}</th>
                  <th className="py-2.5 px-4 text-right">{TABLE_COLUMN_LABELS.ACTIONS}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {items.map((item) => {
                  const isHidden = !!item.hidden;
                  const slotConfig = isCategory ? formatTryOnSlot(item.slot || item.tryonSlot) : null;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#fcfdfc] transition-colors ${isHidden ? 'bg-[#fafafa] text-[#8a8a8a]' : 'text-[#191C19]'
                        }`}
                    >
                      <td className="py-3 px-4 font-semibold text-xs">
                        <span className={isHidden ? 'line-through text-[#8a8a8a]' : ''}>{item.name}</span>
                      </td>

                      {isCategory && (
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${slotConfig.badgeClass}`}
                          >
                            {slotConfig.label}
                          </span>
                        </td>
                      )}

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isHidden ? (
                          <span className="inline-flex items-center justify-center text-[11px] font-bold px-3 py-1 border border-[#FECDCA] bg-[#FEF3F2] text-[#B42318] rounded-lg uppercase whitespace-nowrap">
                            ĐÃ ẨN
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center text-[11px] font-bold px-3 py-1 border border-[#A5D6A7] bg-[#E8F5E9] text-[#006B2C] rounded-lg uppercase whitespace-nowrap">
                            HIỆN
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 text-xs whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditor({ kind, item })}
                            className="px-3 py-1.5 rounded-lg border border-neutral bg-white text-[#191C19] hover:bg-[#F6F9F4] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Sửa
                          </button>
                          {!isHidden ? (
                            <button
                              type="button"
                              onClick={() => setHiding({ kind, item })}
                              className="px-3 py-1.5 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] text-[#B42318] hover:bg-[#FEE4E2] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Ẩn
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnhide(item)}
                              className="px-3 py-1.5 rounded-lg border border-[#A5D6A7] bg-[#E8F5E9] text-[#006B2C] hover:bg-[#D1FADF] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Hiện lại
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleting({ kind, item })}
                            className="px-3 py-1.5 rounded-lg border border-[#D92D20] bg-[#D92D20] text-white hover:bg-[#B42318] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Editor Thêm/Sửa */}
      {editor && (
        <CatalogEditor
          {...editor}
          slots={enums.data?.categorySlots || []}
          onClose={() => setEditor(null)}
          onSaved={() => {
            toast.success(`Đã lưu ${editor.kind === 'category' ? 'danh mục' : 'thương hiệu'} thành công.`);
            resource.refresh();
          }}
        />
      )}

      {/* Modal Xác nhận Ẩn */}
      <Modal
        isOpen={!!hiding}
        onClose={() => {
          if (!resource.busy) setHiding(null);
        }}
        title="Xác nhận ẩn"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#191C19]">
            Ẩn “<strong>{hiding?.item.name}</strong>” khỏi các lựa chọn ký gửi mới?
          </p>
          <p className="text-[#5B6776] leading-relaxed">
            Các sản phẩm đã gắn mục này trước đó vẫn giữ nguyên hiển thị trên hệ thống và không bị ảnh hưởng.
          </p>
          <ResourceState resource={resource} />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 py-2"
              onClick={() => setHiding(null)}
              disabled={resource.busy}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              className="flex-1 py-2 font-bold"
              loading={resource.busy}
              onClick={handleHideConfirm}
            >
              Xác nhận ẩn
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Xác nhận Xóa (kèm cơ chế bảo toàn dữ liệu F-145) */}
      <Modal
        isOpen={!!deleting}
        onClose={() => {
          if (!deleteBusy) setDeleting(null);
        }}
        title="Xác nhận xóa"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#191C19]">
            Bạn có chắc chắn muốn xóa {deleting?.kind === 'category' ? 'danh mục' : 'thương hiệu'} “<strong>{deleting?.item.name}</strong>”?
          </p>
          <div className="rounded-xl border border-[#DDE5D9] bg-[#FAFBF9] p-3 text-[11px] text-[#5B6776] leading-relaxed">
            <strong className="text-[#191C19] block mb-1">Quy định bảo toàn dữ liệu:</strong>
            Nếu mục này chưa có sản phẩm nào tham chiếu, hệ thống sẽ xóa vĩnh viễn. Nếu đã có sản phẩm hoặc phiếu ký gửi lịch sử, hệ thống sẽ tự động chuyển sang chế độ <strong>Ẩn</strong> để bảo toàn thông tin sản phẩm cũ.
          </div>
          <ResourceState resource={resource} />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 py-2"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              className="flex-1 py-2 font-bold"
              loading={deleteBusy}
              disabled={deleteBusy}
              onClick={handleDeleteConfirm}
            >
              Xác nhận xóa
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
