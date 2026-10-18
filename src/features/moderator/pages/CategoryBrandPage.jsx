import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';

/**
 * Trang Quản Lý Danh Mục (Slot Thử Đồ AI) & Thương Hiệu Được Nhận (F-142..F-145, UC-72..75)
 * Moderator cấu hình danh mục quần áo ký gửi và gán slot thử đồ AI (Áo hoặc Quần)
 */
export default function CategoryBrandPage() {
  const [activeTab, setActiveTab] = useState('CATEGORIES'); // 'CATEGORIES' | 'BRANDS'

  const [categories, setCategories] = useState([
    { id: 'CAT-01', name: 'Áo khoác', tryOnSlot: 'ÁO', activeItemsCount: 142, status: 'ACTIVE' },
    { id: 'CAT-02', name: 'Áo sơ mi', tryOnSlot: 'ÁO', activeItemsCount: 98, status: 'ACTIVE' },
    { id: 'CAT-03', name: 'Áo thun polo', tryOnSlot: 'ÁO', activeItemsCount: 110, status: 'ACTIVE' },
    { id: 'CAT-04', name: 'Quần jeans', tryOnSlot: 'QUẦN', activeItemsCount: 165, status: 'ACTIVE' },
    { id: 'CAT-05', name: 'Quần tây / Khaki', tryOnSlot: 'QUẦN', activeItemsCount: 74, status: 'ACTIVE' },
    { id: 'CAT-06', name: 'Chân váy', tryOnSlot: 'QUẦN', activeItemsCount: 52, status: 'ACTIVE' },
    { id: 'CAT-07', name: 'Áo len mùa đông', tryOnSlot: 'ÁO', activeItemsCount: 30, status: 'ACTIVE' },
    { id: 'CAT-08', name: 'Đồ bơi', tryOnSlot: 'KHÔNG ÁP DỤNG', activeItemsCount: 0, status: 'HIDDEN' },
  ]);

  const [brands, setBrands] = useState([
    { id: 'BR-01', name: 'Uniqlo', origin: 'Nhật Bản', accepted: true, itemsCount: 210 },
    { id: 'BR-02', name: 'Zara', origin: 'Tây Ban Nha', accepted: true, itemsCount: 185 },
    { id: 'BR-03', name: 'H&M', origin: 'Thụy Điển', accepted: true, itemsCount: 140 },
    { id: 'BR-04', name: 'Levi\'s', origin: 'Mỹ', accepted: true, itemsCount: 95 },
    { id: 'BR-05', name: 'Owen', origin: 'Việt Nam', accepted: true, itemsCount: 60 },
    { id: 'BR-06', name: 'Routine', origin: 'Việt Nam', accepted: true, itemsCount: 45 },
    { id: 'BR-07', name: 'An Phước', origin: 'Việt Nam', accepted: true, itemsCount: 38 },
  ]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catSlot, setCatSlot] = useState('ÁO');

  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandOrigin, setBrandOrigin] = useState('');

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlot('ÁO');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlot(cat.tryOnSlot);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      setCategories(categories.map((c) =>
        c.id === editingCategory.id ? { ...c, name: catName, tryOnSlot: catSlot } : c
      ));
    } else {
      const newCat = {
        id: `CAT-0${categories.length + 1}`,
        name: catName,
        tryOnSlot: catSlot,
        activeItemsCount: 0,
        status: 'ACTIVE',
      };
      setCategories([...categories, newCat]);
    }
    setIsCategoryModalOpen(false);
    alert('Đã lưu cấu hình danh mục thành công!');
  };

  const handleToggleHideCategory = (cat) => {
    const nextStatus = cat.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    setCategories(categories.map((c) =>
      c.id === cat.id ? { ...c, status: nextStatus } : c
    ));
    alert(`Đã ${nextStatus === 'HIDDEN' ? 'ẩn' : 'mở lại'} danh mục "${cat.name}". Dữ liệu sản phẩm cũ vẫn được bảo lưu.`);
  };

  const handleSaveBrand = (e) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    const newBrand = {
      id: `BR-0${brands.length + 1}`,
      name: brandName,
      origin: brandOrigin || 'Không xác định',
      accepted: true,
      itemsCount: 0,
    };
    setBrands([...brands, newBrand]);
    setIsBrandModalOpen(false);
    setBrandName('');
    setBrandOrigin('');
    alert('Đã thêm thương hiệu mới vào danh sách được phép ký gửi!');
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
                Cấu hình kho
              </span>
              <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
                Quản Lý Danh Mục & Thương Hiệu
              </h1>
            </div>
            <p className="text-xs text-[#717971] mt-1">
              Gán slot Thử đồ AI (Áo / Quần) cho danh mục và thiết lập danh sách thương hiệu thời trang được tiếp nhận ký gửi.
            </p>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-[#DDE5D9] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('CATEGORIES')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'CATEGORIES' ? 'bg-[#006B2C] text-white shadow-sm' : 'text-[#717971]'
              }`}
            >
              Danh mục & Slot Thử đồ AI ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('BRANDS')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'BRANDS' ? 'bg-[#006B2C] text-white shadow-sm' : 'text-[#717971]'
              }`}
            >
              Thương hiệu được nhận ({brands.length})
            </button>
          </div>
        </div>

        {/* TAB 1: Danh mục & Slot Thử đồ AI */}
        {activeTab === 'CATEGORIES' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#717971]">
                * Thử đồ AI cố định 2 slot bắt buộc: <strong>Áo</strong> và <strong>Quần</strong> (Mục 0 & Mục 10).
              </span>
              <Button
                onClick={handleOpenCreateCategory}
                className="bg-[#006B2C] text-white text-xs"
              >
                <span className="material-symbols-outlined text-sm mr-1">add</span>
                Thêm danh mục mới
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#DDE5D9] bg-[#F8FAF8] text-[#717971] font-bold">
                      <th className="py-3 px-4">Mã</th>
                      <th className="py-3 px-4">Tên danh mục</th>
                      <th className="py-3 px-4">Slot Thử đồ AI (AI Try-on)</th>
                      <th className="py-3 px-4 text-center">Sản phẩm đang ký gửi</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F4EE]">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-[#F9FBF9] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#717971]">{cat.id}</td>
                        <td className="py-3 px-4 font-bold text-[#191C19]">{cat.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            cat.tryOnSlot === 'ÁO' ? 'bg-[#E0F2F1] text-[#00685F]' :
                            cat.tryOnSlot === 'QUẦN' ? 'bg-[#EDE7F6] text-[#673AB7]' :
                            'bg-[#F6F9F4] text-[#717971]'
                          }`}>
                            Slot: {cat.tryOnSlot}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-[#006B2C]">
                          {cat.activeItemsCount} món
                        </td>
                        <td className="py-3 px-4 text-center">
                          {cat.status === 'ACTIVE' ? (
                            <Badge variant="success">Hoạt động</Badge>
                          ) : (
                            <Badge variant="danger">Đã ẩn</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <Button size="sm" variant="outline" onClick={() => handleOpenEditCategory(cat)}>
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant={cat.status === 'ACTIVE' ? 'danger' : 'outline'}
                            onClick={() => handleToggleHideCategory(cat)}
                          >
                            {cat.status === 'ACTIVE' ? 'Ẩn' : 'Mở lại'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Thương hiệu được nhận */}
        {activeTab === 'BRANDS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#717971]">
                Chỉ nhận ký gửi các thương hiệu đã được xác thực xuất xứ và uy tín chất lượng.
              </span>
              <Button
                onClick={() => setIsBrandModalOpen(true)}
                className="bg-[#006B2C] text-white text-xs"
              >
                <span className="material-symbols-outlined text-sm mr-1">add</span>
                Thêm thương hiệu
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((b) => (
                <div key={b.id} className="p-4 bg-white rounded-xl border border-[#DDE5D9] shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#191C19]">{b.name}</h4>
                    <p className="text-[11px] text-[#717971]">Xuất xứ: {b.origin}</p>
                    <p className="text-[10px] text-[#006B2C] font-semibold mt-1">Đã tiếp nhận: {b.itemsCount} sản phẩm</p>
                  </div>
                  <Badge variant="success">Được nhận</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal thêm/sửa danh mục */}
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục quần áo mới'}
        >
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <Input
              label="Tên danh mục"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Ví dụ: Áo len cổ lọ, Quần short kaki..."
            />

            <div>
              <label className="block text-xs font-semibold text-[#191C19] mb-1">
                Slot gán trong Thử Đồ AI (AI Virtual Try-on):
              </label>
              <select
                value={catSlot}
                onChange={(e) => setCatSlot(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#191C19]"
              >
                <option value="ÁO">Slot ÁO (Áo thun, sơ mi, khoác, blazer, len...)</option>
                <option value="QUẦN">Slot QUẦN (Quần jean, âu, kaki, chân váy...)</option>
                <option value="KHÔNG ÁP DỤNG">Không áp dụng thử đồ AI (Phụ kiện, khăn...)</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#DDE5D9]">
              <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-[#006B2C] text-white">Lưu danh mục</Button>
            </div>
          </form>
        </Modal>

        {/* Modal thêm thương hiệu */}
        <Modal
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          title="Thêm thương hiệu ký gửi mới"
        >
          <form onSubmit={handleSaveBrand} className="space-y-4">
            <Input
              label="Tên thương hiệu"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Mango, GAP, Routine, Tommy Hilfiger..."
            />
            <Input
              label="Quốc gia xuất xứ"
              value={brandOrigin}
              onChange={(e) => setBrandOrigin(e.target.value)}
              placeholder="Việt Nam, Mỹ, Nhật Bản, Pháp..."
            />
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#DDE5D9]">
              <Button variant="ghost" onClick={() => setIsBrandModalOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-[#006B2C] text-white">Thêm thương hiệu</Button>
            </div>
          </form>
        </Modal>
      </div>
    </ModeratorLayout>
  );
}
