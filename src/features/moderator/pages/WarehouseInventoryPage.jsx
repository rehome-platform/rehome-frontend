import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import BarcodePrintModal from '../components/BarcodePrintModal.jsx';
import { formatCurrencyVND } from '../../../utils/formatters.js';

/**
 * Trang Quản Lý Kho Chi Nhánh & Tồn Kho (F-123..F-126, F-130, UC-63, 64, 67)
 * Moderator quản lý danh mục tồn kho của chi nhánh mình, cập nhật vị trí kệ và xử lý hàng vô thừa nhận
 */
export default function WarehouseInventoryPage() {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNCLAIMED'
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [printItem, setPrintItem] = useState(null);
  const [editShelfItem, setEditShelfItem] = useState(null);
  const [newShelf, setNewShelf] = useState('');

  const [inventory, setInventory] = useState([
    {
      id: 'ITM-01',
      sku: 'Q7-AK-000845',
      name: 'Áo khoác dạ nữ dáng dài',
      brand: 'Uniqlo',
      category: 'Áo khoác',
      size: 'M',
      sellingPrice: 1000000,
      shelfLocation: 'Kệ A2 - Tầng 3 - Hộp 14',
      term: 'Kỳ 1 (Còn 18 ngày)',
      status: 'ON_SALE', // 'ON_SALE' | 'UNCLAIMED' | 'WAITING_SHIP'
      stockInDate: '10/10/2026',
    },
    {
      id: 'ITM-02',
      sku: 'Q7-QN-000312',
      name: 'Quần jeans Levi\'s 501 Original',
      brand: 'Levi\'s',
      category: 'Quần jean',
      size: '31',
      sellingPrice: 750000,
      shelfLocation: 'Kệ B1 - Tầng 1 - Hộp 02',
      term: 'Kỳ 2 (Còn 24 ngày)',
      status: 'ON_SALE',
      stockInDate: '12/09/2026',
    },
    {
      id: 'ITM-03',
      sku: 'Q7-SM-000109',
      name: 'Áo sơ mi lụa tơ tằm cổ bẻ',
      brand: 'Owen',
      category: 'Áo sơ mi',
      size: 'L',
      sellingPrice: 320000,
      shelfLocation: 'Kệ C3 - Tầng 2 - Hộp 08',
      term: 'Hết 90 ngày (Quá 30 ngày xử lý)',
      status: 'UNCLAIMED', // Vô thừa nhận
      stockInDate: '15/06/2026',
    },
    {
      id: 'ITM-04',
      sku: 'Q7-CV-000551',
      name: 'Chân váy xếp ly hoa nhí Zara',
      brand: 'Zara',
      category: 'Chân váy',
      size: 'S',
      sellingPrice: 420000,
      shelfLocation: 'Kệ A1 - Tầng 2 - Hộp 05',
      term: 'Kỳ 1 (Còn 29 ngày)',
      status: 'ON_SALE',
      stockInDate: '14/10/2026',
    },
  ]);

  const filteredItems = inventory.filter((item) => {
    const matchQuery = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shelfLocation.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'UNCLAIMED') return matchQuery && item.status === 'UNCLAIMED';
    return matchQuery;
  });

  const handleUpdateShelf = (e) => {
    e.preventDefault();
    if (!newShelf.trim()) return;
    setInventory(inventory.map((item) =>
      item.id === editShelfItem.id ? { ...item, shelfLocation: newShelf } : item
    ));
    setEditShelfItem(null);
    setNewShelf('');
    alert('Đã cập nhật vị trí kệ và ghi nhận biến động nhập xuất kho!');
  };

  const handleClearUnclaimed = (id) => {
    setInventory(inventory.filter((item) => item.id !== id));
    alert('Đã bàn giao món hàng vô thừa nhận cho tổ chức từ thiện đối tác theo biên bản thanh lý!');
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
                Kho Quận 7
              </span>
              <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
                Quản Lý Kho Chi Nhánh & Tồn Kho
              </h1>
            </div>
            <p className="text-xs text-[#717971] mt-1">
              Theo dõi chính xác vị trí kệ, quét QR SKU để kiểm đếm và xử lý hàng vô thừa nhận cuối kỳ 90 ngày.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setIsScannerOpen(true)}
              className="bg-[#006B2C] hover:bg-[#005221] text-white text-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[18px] mr-1.5">qr_code_scanner</span>
              Quét QR định vị SKU
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-[#DDE5D9] shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717971] text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo SKU, tên sản phẩm, vị trí kệ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F8FAF8] text-xs text-[#191C19] focus:outline-none focus:border-[#006B2C]"
            />
          </div>

          <div className="flex bg-[#F8FAF8] p-1 rounded-xl border border-[#DDE5D9] text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition-colors ${
                activeTab === 'ALL' ? 'bg-[#006B2C] text-white' : 'text-[#717971]'
              }`}
            >
              Tất cả tồn kho ({inventory.length})
            </button>
            <button
              onClick={() => setActiveTab('UNCLAIMED')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                activeTab === 'UNCLAIMED' ? 'bg-[#D97706] text-white' : 'text-[#717971]'
              }`}
            >
              <span>Hàng vô thừa nhận</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {inventory.filter((i) => i.status === 'UNCLAIMED').length}
              </span>
            </button>
          </div>
        </div>

        {/* Bảng tồn kho */}
        <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DDE5D9] bg-[#F8FAF8] text-[#717971] font-bold">
                  <th className="py-3 px-4">Mã SKU / Ngày nhập</th>
                  <th className="py-3 px-4">Thông tin sản phẩm</th>
                  <th className="py-3 px-4">Vị trí kệ kho</th>
                  <th className="py-3 px-4">Kỳ ký gửi</th>
                  <th className="py-3 px-4 text-right">Giá niêm yết</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F4EE]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FBF9] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#006B2C]">{item.sku}</span>
                      <p className="text-[10px] text-[#717971]">{item.stockInDate}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#191C19]">{item.name}</p>
                      <p className="text-[11px] text-[#717971]">{item.brand} • Size {item.size}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#191C19]">
                      <span className="px-2 py-1 rounded-lg bg-[#F0F5EE] border border-[#DDE5D9]">
                        📍 {item.shelfLocation}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#414942]">
                      {item.term}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#006B2C]">
                      {formatCurrencyVND(item.sellingPrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'ON_SALE' ? (
                        <Badge variant="success">Đang niêm yết</Badge>
                      ) : (
                        <Badge variant="danger">Vô thừa nhận</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {item.status === 'UNCLAIMED' ? (
                        <Button
                          size="sm"
                          className="bg-[#00685F] text-white text-[11px]"
                          onClick={() => handleClearUnclaimed(item.id)}
                        >
                          Chuyển từ thiện
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditShelfItem(item);
                              setNewShelf(item.shelfLocation);
                            }}
                          >
                            Đổi vị trí kệ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPrintItem(item)}
                          >
                            In tem SKU
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal đổi vị trí kệ */}
        <Modal
          isOpen={!!editShelfItem}
          onClose={() => setEditShelfItem(null)}
          title={`Cập nhật vị trí kệ: ${editShelfItem?.sku}`}
        >
          <form onSubmit={handleUpdateShelf} className="space-y-4">
            <Input
              label="Vị trí kệ mới trong kho"
              required
              value={newShelf}
              onChange={(e) => setNewShelf(e.target.value)}
              placeholder="Ví dụ: Kệ B2 - Tầng 4 - Ngăn 01"
            />
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#DDE5D9]">
              <Button variant="ghost" onClick={() => setEditShelfItem(null)}>Hủy</Button>
              <Button type="submit" className="bg-[#006B2C] text-white">Lưu vị trí kệ</Button>
            </div>
          </form>
        </Modal>

        {/* Modal in tem SKU */}
        <BarcodePrintModal
          isOpen={!!printItem}
          onClose={() => setPrintItem(null)}
          item={printItem}
        />

        {/* Scanner Modal */}
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(code) => {
            setSearchTerm(code);
            setIsScannerOpen(false);
          }}
        />
      </div>
    </ModeratorLayout>
  );
}
