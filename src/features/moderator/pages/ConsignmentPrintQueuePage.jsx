import React, { useState } from 'react';
import { Page } from '../components/WarehouseUi.jsx';
import Button from '../../../components/common/Button.jsx';

const DEFAULT_PRINT_ITEMS = [
  {
    id: 'Q7-AK-000846',
    sku: 'Q7-AK-000846',
    name: 'Áo khoác dạ nữ',
    brand: 'Uniqlo',
    size: 'M',
    condition: 'Tốt',
    category: 'Áo khoác',
    stockedAt: 'hôm nay 09:52',
    moderator: 'MOD-07-003',
  },
  {
    id: 'Q7-TX-000312',
    sku: 'Q7-TX-000312',
    name: 'Túi xách da',
    brand: 'Charles & Keith',
    size: '—',
    condition: 'Khá',
    category: 'Túi xách',
    stockedAt: 'hôm nay 10:24',
    moderator: 'MOD-07-003',
  },
  {
    id: 'Q7-QJ-000714',
    sku: 'Q7-QJ-000714',
    name: 'Quần jeans ống suông',
    brand: "Levi's",
    size: '30',
    condition: 'Như mới',
    category: 'Quần dài',
    stockedAt: 'hôm qua 16:40',
    moderator: 'MOD-07-011',
  },
  {
    id: 'Q7-AS-000522',
    sku: 'Q7-AS-000522',
    name: 'Áo sơ mi caro',
    brand: 'H&M',
    size: 'S',
    condition: 'Tốt',
    category: 'Áo sơ mi',
    stockedAt: 'hôm qua 15:08',
    moderator: 'MOD-07-011',
  },
  {
    id: 'Q7-VA-000601',
    sku: 'Q7-VA-000601',
    name: 'Váy midi xếp ly',
    brand: 'Zara',
    size: 'M',
    condition: 'Tốt',
    category: 'Váy',
    stockedAt: 'hôm qua 14:15',
    moderator: 'MOD-07-003',
  },
  {
    id: 'Q7-GI-000188',
    sku: 'Q7-GI-000188',
    name: 'Giày sneaker trắng',
    brand: 'Adidas',
    size: '40',
    condition: 'Khá',
    category: 'Giày',
    stockedAt: 'hôm qua 11:30',
    moderator: 'MOD-07-011',
  },
];

export default function ConsignmentPrintQueuePage() {
  const [items, setItems] = useState(DEFAULT_PRINT_ITEMS);
  const [selectedIds, setSelectedIds] = useState(
    DEFAULT_PRINT_ITEMS.slice(0, 5).map((i) => i.id)
  );
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const filteredItems = items.filter(
    (item) =>
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const toggleItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const previewItem =
    items.find((i) => i.id === selectedIds[0]) || items[0];

  const handleDownloadPdf = () => {
    if (selectedIds.length === 0) return;
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setFeedback(`Đã tạo PDF thành công cho ${selectedIds.length} tem. Các món đã in sẽ rời khỏi hàng đợi.`);
      // Remove printed items from queue
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    }, 800);
  };

  return (
    <Page
      title="Hàng đợi in tem"
      subtitle="Kiểm định & nhập kho · Món nhập kho xong tự vào đây"
      actions={
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tìm SKU, tên món, danh mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-[#8a8a8a] px-3 py-1.5 text-xs w-60"
          />
        </div>
      }
    >
      {feedback && (
        <div
          role="alert"
          className="rounded-xl bg-[#E8F5E9] border border-[#A5D6A7] p-3.5 text-xs font-semibold text-[#006B2C] flex items-center justify-between"
        >
          <p>{feedback}</p>
          <button
            type="button"
            className="text-xs font-bold underline cursor-pointer"
            onClick={() => setFeedback(null)}
          >
            Đóng
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
        {/* ================= CỘT TRÁI: DANH SÁCH HÀNG ĐỢI IN TEM ================= */}
        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <h3 className="text-base font-bold text-[#191C19]">
              Danh sách chờ in tem
            </h3>
            <span className="text-xs font-semibold text-[#5B6776]">
              đã chọn {selectedIds.length} / {items.length} món
            </span>
          </div>

          <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
            <div className="flex items-center bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#5f5f5f]">
              <span className="w-8 shrink-0">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded text-[#2b2b2b]"
                />
              </span>
              <span className="w-32 shrink-0">SKU</span>
              <span className="flex-1 min-w-0">Sản phẩm</span>
              <span className="w-24 shrink-0">Danh mục</span>
              <span className="w-28 shrink-0">Nhập kho lúc</span>
              <span className="w-24 shrink-0 text-right">Người nhập</span>
            </div>

            <div className="divide-y divide-[#e0e0e0]">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#717971]">
                  Không có sản phẩm nào trong hàng đợi in tem.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`flex items-center px-4 py-3 text-xs cursor-pointer transition-colors ${isChecked ? 'bg-[#f8faf8]' : 'hover:bg-[#fafafa]'
                        }`}
                    >
                      <span className="w-8 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${item.sku}`}
                          checked={isChecked}
                          onChange={() => toggleItem(item.id)}
                          className="rounded text-[#2b2b2b]"
                        />
                      </span>
                      <span className="w-32 shrink-0 font-bold font-mono text-[#191C19]">
                        {item.sku}
                      </span>
                      <span className="flex-1 min-w-0 pr-2">
                        <strong className="text-[#191C19] block">{item.name}</strong>
                        <span className="text-[11px] text-[#717971]">
                          {item.brand} · {item.size}
                        </span>
                      </span>
                      <span className="w-24 shrink-0 text-[#5f5f5f]">{item.category}</span>
                      <span className="w-28 shrink-0 text-[#717971] text-[11px]">
                        {item.stockedAt}
                      </span>
                      <span className="w-24 shrink-0 text-right font-mono text-[11px] text-[#5f5f5f]">
                        {item.moderator}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-[#9a9a9a] p-3 text-xs text-[#5f5f5f] leading-relaxed">
            Món nào đã in rồi sẽ rời khỏi hàng đợi. Cần in lại vì tem rách thì tìm món đó ở mục Tồn kho và in riêng.
          </div>
        </div>

        {/* ================= CỘT PHẢI: XEM TRƯỚC TEM & BỐ CỤC TỜ IN ================= */}
        <div className="space-y-5">
          {/* 1. XEM TRƯỚC MỘT TEM · 70 × 37 MM */}
          <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b6b6b]">
              Xem trước một tem · 70 × 37 mm
            </h4>

            {previewItem ? (
              <div className="rounded-xl border-2 border-[#2b2b2b] bg-white p-4 space-y-2 font-sans shadow-inner">
                <div className="text-[9px] uppercase tracking-widest text-[#5f5f5f] font-semibold">
                  REHOME · KHO QUẬN 7
                </div>
                <div className="text-xl font-extrabold font-mono tracking-wider text-[#191C19]">
                  {previewItem.sku}
                </div>
                <div className="h-0.5 bg-[#2b2b2b]" />
                <div className="text-xs font-bold text-[#191C19]">
                  {previewItem.name}
                </div>
                <div className="text-[11px] text-[#5f5f5f]">
                  {previewItem.brand} · Size {previewItem.size} · Tình trạng {previewItem.condition}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#717971]">Chọn món để xem trước mẫu tem.</p>
            )}

            <p className="text-[10px] text-[#717971] leading-relaxed">
              <strong>Tem chỉ in thông tin không đổi.</strong> Giá, vị trí kệ, trạng thái bán đều thay đổi được — in lên tem thì vài hôm là tem sai mà không ai biết. Những thứ đó tra theo SKU trên hệ thống.
            </p>
          </div>

          {/* 2. BỐ CỤC TỜ IN A4 24 Ô */}
          <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold text-[#191C19]">Bố cục tờ in</h4>

            <div className="flex gap-4 items-start">
              {/* Lưới 3 x 8 = 24 ô */}
              <div className="w-24 h-32 border border-[#8a8a8a] grid grid-cols-3 grid-rows-8 gap-0.5 p-0.5 bg-[#e0e0e0] shrink-0">
                {Array.from({ length: 24 }).map((_, idx) => {
                  const isFilled = idx < selectedIds.length;
                  return (
                    <span
                      key={idx}
                      className={`block rounded-[1px] transition-colors ${isFilled ? 'bg-[#2b2b2b]' : 'bg-white'
                        }`}
                    />
                  );
                })}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5f5f5f]">Khổ giấy:</span>
                  <strong className="text-[#191C19]">A4</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f5f5f]">Lưới:</span>
                  <strong className="text-[#191C19]">3 × 8 = 24 ô</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f5f5f]">Mỗi tem:</span>
                  <strong className="text-[#191C19]">70 × 37 mm</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5f5f5f]">Lề:</span>
                  <strong className="text-[#191C19]">0</strong>
                </div>
                <p className="text-[10px] text-[#717971] pt-1">
                  Khớp giấy decal A4 24 ô bán sẵn. Ô đen là {selectedIds.length} tem lần in này, còn {Math.max(0, 24 - selectedIds.length)} ô trống.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full py-3.5 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs shadow"
              disabled={selectedIds.length === 0}
              loading={downloading}
              onClick={handleDownloadPdf}
            >
              Tải PDF {selectedIds.length} tem
            </Button>
            <p className="text-[10px] text-[#717971] text-center">
              Tải file về, in lên giấy decal rồi bóc ra dán. Món đã in sẽ rời hàng đợi.
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}

