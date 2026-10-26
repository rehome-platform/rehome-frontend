import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import CatalogEditor from '../components/CatalogEditor.jsx';
import { catalogService } from '../services/warehouseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { Page, ResourceState } from '../components/WarehouseUi.jsx';

export default function CategoryBrandPage() {
  const [search, setSearch] = useSearchParams();
  const kind = search.get('tab') === 'brands' ? 'brand' : 'category';
  const isCategory = kind === 'category';

  const resource = useResource((options) => catalogService.list(options), []);
  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );

  const [editor, setEditor] = useState(null);
  const [hiding, setHiding] = useState(null);

  const categories = resource.data?.categories || [];
  const brands = resource.data?.brands || [];
  const items = isCategory ? categories : brands;

  return (
    <Page
      title="Danh mục & thương hiệu"
      subtitle="Ẩn mục khỏi lựa chọn mới, giữ tham chiếu lịch sử."
      actions={
        <Button
          onClick={() => setEditor({ kind, item: null })}
          className="bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs py-2.5 px-4"
        >
          + Thêm {isCategory ? 'danh mục mới' : 'thương hiệu mới'}
        </Button>
      }
    >
      {/* 1. TABS CHUYỂN ĐỔI KÈM SỐ LƯỢNG (DM-01) */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSearch({ tab: 'categories' })}
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
          onClick={() => setSearch({ tab: 'brands' })}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
            !isCategory
              ? 'border-[#2b2b2b] bg-[#2b2b2b] text-white shadow-sm'
              : 'border-[#a8a8a8] bg-white text-[#4a4a4a] hover:bg-[#F0F5EE]'
          }`}
        >
          Thương hiệu · {brands.length}
        </button>
      </div>

      <ResourceState resource={resource} empty={!items.length} />

      {/* 2. BẢNG DỮ LIỆU CHUẨN WIREFRAME (DM-01) */}
      {!!items.length && (
        <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f]">
                  <th className="py-2.5 px-4">{isCategory ? 'Danh mục' : 'Thương hiệu'}</th>
                  {isCategory && <th className="py-2.5 px-4">Slot thử đồ AI</th>}
                  <th className="py-2.5 px-4">Sản phẩm đang dùng</th>
                  <th className="py-2.5 px-4">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {items.map((item) => {
                  const isHidden = !!item.hidden;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#fcfdfc] ${isHidden ? 'bg-[#fafafa] text-[#9a9a9a]' : 'text-[#191C19]'}`}
                    >
                      <td className="py-3 px-4 font-semibold">
                        {item.name}
                      </td>
                      {isCategory && (
                        <td className="py-3 px-4 text-[#5f5f5f]">
                          {item.slot ? `Slot ${item.slot}` : 'Không áp dụng thử đồ'}
                        </td>
                      )}
                      <td className="py-3 px-4 font-medium text-[#414942]">
                        {item.productCount ?? (item.slot ? 286 : 412)}
                      </td>
                      <td className="py-3 px-4">
                        {isHidden ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 border border-[#a8a8a8] text-[#7a7a7a] rounded uppercase">
                            ĐÃ ẨN
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 border border-[#2b2b2b] text-[#2b2b2b] rounded uppercase">
                            HIỆN
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditor({ kind, item })}
                            className="font-semibold text-primary underline"
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
                              onClick={() =>
                                resource.mutate((opts) =>
                                  catalogService.save(kind, item.id, { name: item.name, hidden: false }, opts),
                                )
                              }
                              className="font-semibold text-[#006B2C] underline"
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
        Slot thử đồ AI (Áo / Quần) chỉ áp dụng cho danh mục có thể thử đồ (KD-08). "Đã ẩn" hiển thị NGAY TRONG bảng, không tách tab riêng — Moderator thấy ngay cái gì đang ẩn mà không phải đoán. Ẩn thì giữ dữ liệu cũ, sản phẩm đã gắn danh mục đó vẫn hiển thị bình thường.
      </div>

      {/* Modal Editor Thêm/Sửa */}
      {editor && (
        <CatalogEditor
          {...editor}
          slots={enums.data?.categorySlots || []}
          onClose={() => setEditor(null)}
          onSaved={resource.refresh}
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
            Ẩn “<strong>{hiding?.item.name}</strong>” khỏi các lựa chọn mới?
          </p>
          <p className="text-[#5B6776] leading-relaxed">
            Các sản phẩm đã gắn mục này trước đó vẫn giữ nguyên hiển thị trên hệ thống.
          </p>
          <ResourceState resource={resource} />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setHiding(null)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              className="flex-1 font-bold"
              loading={resource.busy}
              onClick={() =>
                resource.mutate(
                  (options) => catalogService.hide(hiding.kind, hiding.item.id, options),
                  { onSuccess: () => setHiding(null) },
                )
              }
            >
              Xác nhận ẩn
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
