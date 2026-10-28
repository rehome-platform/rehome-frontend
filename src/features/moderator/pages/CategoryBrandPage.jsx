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

export default function CategoryBrandPage() {
  const [search, setSearch] = useSearchParams();
  const kind = search.get('tab') === 'brands' ? 'brand' : 'category';
  const isCategory = kind === 'category';

  const [keyword, setKeyword] = useState('');
  const [editor, setEditor] = useState(null);
  const [hiding, setHiding] = useState(null);
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

  // Lọc nhanh theo từ khóa tìm kiếm
  const items = useMemo(() => filterCatalogItems(rawItems, keyword), [rawItems, keyword]);

  const handleUnhide = (item) => {
    setFeedback(null);
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
          setFeedback({
            type: 'success',
            message: `Đã kích hoạt lại ${isCategory ? 'danh mục' : 'thương hiệu'} "${item.name}".`,
          });
          resource.refresh();
        },
      },
    );
  };

  const handleHideConfirm = () => {
    if (!hiding) return;
    setFeedback(null);
    resource.mutate(
      (options) => catalogService.hide(hiding.kind, hiding.item.id, options),
      {
        onSuccess: () => {
          setFeedback({
            type: 'success',
            message: `Đã ẩn ${hiding.kind === 'category' ? 'danh mục' : 'thương hiệu'} "${hiding.item.name}".`,
          });
          setHiding(null);
          resource.refresh();
        },
      },
    );
  };

  return (
    <Page
      title="Danh mục & thương hiệu"
      subtitle="Quản lý cấu hình danh mục sản phẩm, slot thử đồ AI và thương hiệu ký gửi tại kho."
      actions={
        <Button
          onClick={() => setEditor({ kind, item: null })}
          className="bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs py-2.5 px-4 shadow-sm"
        >
          + Thêm {isCategory ? 'danh mục mới' : 'thương hiệu mới'}
        </Button>
      }
    >
      {/* Banner thông báo kết quả */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium border ${
            feedback.type === 'success'
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

      {/* 1. TABS CHUYỂN ĐỔI KÈM SỐ LƯỢNG & Ô TÌM KIẾM NHANH (DM-01) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setSearch({ tab: 'categories' });
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              isCategory
                ? 'border-[#2b2b2b] bg-[#2b2b2b] text-white shadow-sm'
                : 'border-[#a8a8a8] bg-white text-[#4a4a4a] hover:bg-[#F0F5EE]'
            }`}
          >
            Danh mục · {categories.length}
          </button>
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setSearch({ tab: 'brands' });
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              !isCategory
                ? 'border-[#2b2b2b] bg-[#2b2b2b] text-white shadow-sm'
                : 'border-[#a8a8a8] bg-white text-[#4a4a4a] hover:bg-[#F0F5EE]'
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
                <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f]">
                  <th className="py-2.5 px-4">{isCategory ? 'Danh mục' : 'Thương hiệu'}</th>
                  {isCategory && <th className="py-2.5 px-4">Slot thử đồ AI</th>}
                  <th className="py-2.5 px-4">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {items.map((item) => {
                  const isHidden = !!item.hidden;
                  const slotConfig = isCategory ? formatTryOnSlot(item.slot || item.tryonSlot) : null;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#fcfdfc] transition-colors ${
                        isHidden ? 'bg-[#fafafa] text-[#8a8a8a]' : 'text-[#191C19]'
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

                      <td className="py-3 px-4">
                        {isHidden ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 border border-[#a8a8a8] bg-[#f0f0f0] text-[#7a7a7a] rounded uppercase">
                            ĐÃ ẨN
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 border border-[#2b2b2b] text-[#2b2b2b] bg-white rounded uppercase">
                            HIỆN
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditor({ kind, item })}
                            className="font-semibold text-primary underline hover:opacity-80"
                          >
                            Sửa
                          </button>
                          {!isHidden ? (
                            <button
                              type="button"
                              onClick={() => setHiding({ kind, item })}
                              className="font-semibold text-[#7a7a7a] hover:text-[#BA1A1A] underline"
                            >
                              Ẩn
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnhide(item)}
                              className="font-semibold text-[#006B2C] hover:underline"
                            >
                              Hiện lại
                            </button>
                          )}
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

      {/* 3. LƯU Ý NGHIỆP VỤ BẢNG DANH MỤC (DM-01) */}
      <div className="rounded-xl border border-dashed border-[#9a9a9a] bg-[#f9faf9] p-4 text-xs leading-relaxed text-[#4a4a4a]">
        <strong>Lưu ý nghiệp vụ:</strong> Slot thử đồ AI (Áo / Quần / Đầm) chỉ định vị trí sản phẩm cho tính năng Virtual Try-On. "Đã ẩn" hiển thị ngay trong bảng kèm nhãn xám để dễ quản lý. Ẩn mục sẽ ngăn các lần ký gửi mới nhưng toàn bộ dữ liệu lịch sử và sản phẩm đã nhập kho vẫn được bảo toàn nguyên vẹn.
      </div>

      {/* Modal Editor Thêm/Sửa */}
      {editor && (
        <CatalogEditor
          {...editor}
          slots={enums.data?.categorySlots || []}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setFeedback({
              type: 'success',
              message: `Đã lưu ${editor.kind === 'category' ? 'danh mục' : 'thương hiệu'} thành công.`,
            });
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
    </Page>
  );
}
