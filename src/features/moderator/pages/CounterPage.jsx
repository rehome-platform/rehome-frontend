import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Input, Button, Badge, Modal } from '../../../components/common/index.js';
import BarcodePrintModal from '../components/BarcodePrintModal.jsx';
import ConsignmentReceiptModal from '../components/ConsignmentReceiptModal.jsx';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { validateAgreedPrice } from '../../../utils/validators.js';
import { CONDITION_MAP } from '../../../utils/conditionMapping.js';

/**
 * Trang Quầy Tiếp Nhận & Kiểm Định Tại Kho ReHome
 * Triển khai các use case cốt lõi tại quầy của Moderator:
 * - UC-60, F-108..110: Tra cứu Member bằng mã Member hoặc SĐT
 * - UC-62, F-115..117: Kiểm định thật/giả, tình trạng, chốt giá niêm yết & giá sàn
 * - F-118: Trả đồ tại chỗ nếu không đạt
 * - F-119: Nhập kho, gán vị trí kệ
 * - F-122: In tem nhãn SKU
 * - UC-66, F-129: Bàn giao hàng tại quầy (rút hàng hoặc nhận hàng trả)
 * - Mục 12: Lập và in Biên nhận ký gửi
 */
export default function CounterPage() {
  const [activeTab, setActiveTab] = useState('INSPECT'); // 'INSPECT' | 'HANDOVER'
  const [searchQuery, setSearchQuery] = useState('');
  const [foundMember, setFoundMember] = useState(null);
  const [searching, setSearching] = useState(false);

  // Form kiểm định tại chỗ
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Áo khoác');
  const [brand, setBrand] = useState('Uniqlo');
  const [size, setSize] = useState('M');
  const [conditionVal, setConditionVal] = useState(2);
  const [sellingPrice, setSellingPrice] = useState('850000');
  const [shelfLocation, setShelfLocation] = useState('Kệ A2-Tầng 3');
  const [priceError, setPriceError] = useState('');

  // Modals
  const [printLabelItem, setPrintLabelItem] = useState(null);
  const [receiptItem, setReceiptItem] = useState(null);
  const [successItem, setSuccessItem] = useState(null);

  // Mock danh sách giao nhận tại quầy (rút hàng hoặc nhận hàng trả)
  const [handoverQueue, setHandoverQueue] = useState([
    {
      id: 'HO-101',
      memberCode: 'MB-0098231',
      memberName: 'Trần Thị B',
      type: 'RÚT HÀNG KÝ GỬI (ĐÃ TRẢ PHÍ)',
      item: 'Áo blazer tweed Zara',
      sku: 'Q7-BL-000192',
      status: 'PENDING_PICKUP',
      deadline: 'Còn 3 ngày đến lấy',
    },
    {
      id: 'HO-102',
      memberCode: 'MB-0081294',
      memberName: 'Lê Văn Hoàng',
      type: 'NHẬN HÀNG TRẢ KHÔNG HỢP LỆ',
      item: 'Quần jeans Levi\'s 501',
      sku: 'Q7-QN-000412',
      status: 'PENDING_PICKUP',
      deadline: 'Còn 5 ngày đến lấy',
    },
  ]);

  const handleLookupMember = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);

    setTimeout(() => {
      setSearching(false);
      // Mock tìm kiếm theo mã Member hoặc SĐT (F-108, F-110)
      setFoundMember({
        code: searchQuery.startsWith('MB') ? searchQuery : 'MB-0098231',
        name: 'Trần Thị B',
        phone: '0903 112 458',
        email: 'tranthib@example.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        verified: true,
        pendingFormsCount: 1,
        activeConsignmentsCount: 3,
        walletBalance: 1250000,
      });
    }, 400);
  };

  const handleInspectSubmit = (e) => {
    e.preventDefault();
    const err = validateAgreedPrice(sellingPrice);
    if (err) {
      setPriceError(err);
      return;
    }

    const skuGen = `Q7-${category === 'Áo khoác' ? 'AK' : 'SP'}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newItem = {
      sku: skuGen,
      itemName,
      category,
      brand,
      size,
      condition: conditionVal,
      conditionDetail: CONDITION_MAP[conditionVal]?.label,
      sellingPrice: Number(sellingPrice),
      floorPrice: Number(sellingPrice) * 0.5,
      shelfLocation,
      memberCode: foundMember?.code || 'MB-0098231',
      memberName: foundMember?.name || 'Trần Thị B',
      memberPhone: foundMember?.phone || '0903 112 458',
      memberEmail: foundMember?.email || 'tranthib@example.com',
      warehouseName: 'Kho Quận 7 – ReHome',
      moderatorName: 'Nguyễn Văn A',
      moderatorCode: 'MOD-07-003',
      date: new Date().toLocaleDateString('vi-VN'),
    };

    setSuccessItem(newItem);
    setReceiptItem(newItem);
  };

  const handleHandoverItem = (id) => {
    setHandoverQueue(handoverQueue.filter((item) => item.id !== id));
    alert('Đã xác nhận bàn giao hàng cho khách tại quầy thành công! Ghi nhận vào Audit Log.');
  };

  return (
    <ModeratorLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
                Nghiệp vụ Quầy
              </span>
              <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
                Quầy Tiếp Nhận & Kiểm Định
              </h1>
            </div>
            <p className="text-xs text-[#717971] mt-1">
              Tra cứu mã Member, kiểm định hàng hóa thật/giả, chốt giá niêm yết, in tem SKU và bàn giao đồ tại chỗ.
            </p>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-[#DDE5D9] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('INSPECT')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 ${
                activeTab === 'INSPECT' ? 'bg-[#006B2C] text-white shadow-sm' : 'text-[#717971] hover:text-[#191C19]'
              }`}
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              <span>Kiểm định & Nhập kho</span>
            </button>
            <button
              onClick={() => setActiveTab('HANDOVER')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 ${
                activeTab === 'HANDOVER' ? 'bg-[#006B2C] text-white shadow-sm' : 'text-[#717971] hover:text-[#191C19]'
              }`}
            >
              <span className="material-symbols-outlined text-base">handshake</span>
              <span>Bàn giao tại quầy ({handoverQueue.length})</span>
            </button>
          </div>
        </div>

        {/* 1. Thanh tra cứu Member tại quầy (F-108, F-110, UC-60) */}
        <div className="bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-sm">
          <form onSubmit={handleLookupMember} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717971]">
                badge
              </span>
              <input
                type="text"
                placeholder="Nhập mã Member (vd: MB-0098231) hoặc Số điện thoại người mang đồ đến..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#DDE5D9] bg-[#F8FAF8] text-xs text-[#191C19] focus:outline-none focus:border-[#006B2C] focus:bg-white"
              />
            </div>
            <Button
              type="submit"
              loading={searching}
              className="bg-[#006B2C] hover:bg-[#005221] text-white shrink-0 text-xs px-6 py-3"
            >
              <span className="material-symbols-outlined text-base mr-1">search</span>
              Tra cứu hồ sơ Member
            </Button>
          </form>

          {/* Member Card hiển thị kết quả (F-110: resolve to exactly one account) */}
          {foundMember && (
            <div className="mt-4 p-4 rounded-xl bg-[#F0F5EE] border border-[#C8E6C9] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center space-x-3.5">
                <img
                  src={foundMember.avatar}
                  alt={foundMember.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#006B2C]"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-[#191C19]">{foundMember.name}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-white text-[#006B2C] border border-[#C8E6C9]">
                      {foundMember.code}
                    </span>
                    {foundMember.verified && (
                      <Badge variant="success">✓ Đã xác minh</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#414942] mt-0.5">
                    SĐT: <strong>{foundMember.phone}</strong> • Email: {foundMember.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-right">
                <div className="px-3 py-1.5 bg-white rounded-lg border border-[#DDE5D9] text-xs">
                  <span className="text-[#717971] block text-[10px]">Số dư ví Member:</span>
                  <span className="font-bold text-[#006B2C]">{formatCurrencyVND(foundMember.walletBalance)}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setFoundMember(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: Kiểm định & Nhập kho */}
        {activeTab === 'INSPECT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form kiểm định sản phẩm */}
            <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Biểu Mẫu Kiểm Định & Thỏa Thuận Giá Tại Chỗ</h3>
                <p className="text-xs text-[#717971]">
                  Moderator kiểm tra hàng thật/giả, độ mới và thống nhất giá niêm yết với Member theo Điều 2 biên nhận
                </p>
              </div>

              <form onSubmit={handleInspectSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Tên sản phẩm ký gửi"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Ví dụ: Áo khoác dạ nữ dáng dài"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[#191C19] mb-1">
                      Danh mục hàng hóa
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#191C19]"
                    >
                      <option value="Áo khoác">Áo khoác (Slot Thử đồ: Áo)</option>
                      <option value="Áo sơ mi">Áo sơ mi (Slot Thử đồ: Áo)</option>
                      <option value="Áo thun">Áo thun (Slot Thử đồ: Áo)</option>
                      <option value="Quần jean">Quần jean (Slot Thử đồ: Quần)</option>
                      <option value="Quần âu">Quần âu (Slot Thử đồ: Quần)</option>
                      <option value="Chân váy">Chân váy (Slot Thử đồ: Quần)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Thương hiệu (Brand)"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Uniqlo, Zara, Mango, H&M..."
                  />
                  <Input
                    label="Kích cỡ (Size)"
                    required
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="S, M, L, XL, 29, 30..."
                  />
                </div>

                {/* Tình trạng kiểm định (1-5) */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C19] mb-1.5">
                    Độ mới & Tình trạng thực tế (Kiểm định tại kho):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {Object.entries(CONDITION_MAP).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setConditionVal(Number(key))}
                        className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                          conditionVal === Number(key)
                            ? 'border-[#006B2C] bg-[#E8F5E9] text-[#006B2C] font-bold shadow-xs'
                            : 'border-[#DDE5D9] text-[#414942] hover:bg-[#F8FAF8]'
                        }`}
                      >
                        <p className="font-bold">{val.percentage}%</p>
                        <p className="text-[10px] mt-0.5 truncate">{val.shortLabel}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Giá bán và hoa hồng */}
                <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Giá bán niêm yết hai bên thống nhất (VNĐ)"
                      type="number"
                      required
                      value={sellingPrice}
                      onChange={(e) => {
                        setSellingPrice(e.target.value);
                        setPriceError(validateAgreedPrice(e.target.value) || '');
                      }}
                      error={priceError}
                      helperText="Giá sẽ niêm yết công khai trên ReHome"
                    />

                    <div>
                      <label className="block text-xs font-semibold text-[#191C19] mb-1">
                        Giá sàn bảo vệ người bán (50% giá chốt)
                      </label>
                      <div className="p-2.5 bg-white rounded-xl border border-[#DDE5D9] text-xs font-bold text-[#BA1A1A]">
                        {formatCurrencyVND(Number(sellingPrice) * 0.5)}
                      </div>
                      <p className="text-[11px] text-[#717971] mt-1">
                        Member có thể hạ giá trong app nhưng không được dưới mức sàn này.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                    <div className="p-2 bg-white rounded-lg border border-[#DDE5D9]">
                      <span className="text-[#717971] block">Hoa hồng Kỳ 1</span>
                      <strong className="text-[#006B2C]">10% ({formatCurrencyVND(Number(sellingPrice) * 0.1)})</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#DDE5D9]">
                      <span className="text-[#717971] block">Hoa hồng Kỳ 2</span>
                      <strong className="text-[#D97706]">15% ({formatCurrencyVND(Number(sellingPrice) * 0.15)})</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#DDE5D9]">
                      <span className="text-[#717971] block">Hoa hồng Kỳ 3</span>
                      <strong className="text-[#DC2626]">20% ({formatCurrencyVND(Number(sellingPrice) * 0.2)})</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Vị trí kệ kho lưu trữ"
                    id="vị-trí-kệ-kho-lưu-trữ-(f-125)"
                    required
                    value={shelfLocation}
                    onChange={(e) => setShelfLocation(e.target.value)}
                    placeholder="Ví dụ: Kệ A2 - Tầng 3 - Hộp 14"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-[#191C19] mb-1">
                      Kết luận thẩm định
                    </label>
                    <div className="p-2.5 bg-[#E8F5E9] text-[#006B2C] font-bold rounded-xl border border-[#C8E6C9] text-xs flex items-center justify-between">
                      <span>✓ Đạt kiểm định chính hãng</span>
                      <span className="text-[10px] font-normal">Đủ điều kiện lên sàn</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#DDE5D9]">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#BA1A1A] text-[#BA1A1A] hover:bg-[#FFDAD6]/30 text-xs"
                    onClick={() => alert('Đã từ chối kiểm định sản phẩm! Trả đồ tại chỗ cho Member.')}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">cancel</span>
                    Từ chối & Trả đồ tại chỗ
                  </Button>

                  <Button
                    type="submit"
                    className="bg-[#006B2C] hover:bg-[#005221] text-white text-xs px-6"
                  >
                    <span className="material-symbols-outlined text-sm mr-1">inventory</span>
                    Chốt giá & Nhập kho sản phẩm
                  </Button>
                </div>
              </form>
            </div>

            {/* Cột phải: Thẻ tóm tắt kết quả & Thao tác nhanh */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-4">
                <h3 className="text-base font-bold text-[#191C19]">Món Đồ Vừa Nhập Kho</h3>
                {successItem ? (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-[#F0F5EE] rounded-xl border border-[#C8E6C9]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-[#006B2C]">{successItem.sku}</span>
                        <Badge variant="success">Đã nhập kho</Badge>
                      </div>
                      <p className="font-bold text-sm text-[#191C19]">{successItem.itemName}</p>
                      <p className="text-[#414942] mt-0.5">{successItem.brand} • Size {successItem.size}</p>
                      <p className="text-[11px] text-[#717971] mt-1">Vị trí: {successItem.shelfLocation}</p>
                      <p className="text-sm font-extrabold text-[#006B2C] mt-2">
                        {formatCurrencyVND(successItem.sellingPrice)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Button
                        className="w-full bg-[#006B2C] text-white text-xs"
                        onClick={() => setPrintLabelItem(successItem)}
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5">barcode</span>
                        In tem nhãn SKU
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => setReceiptItem(successItem)}
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5">receipt_long</span>
                        Xem Biên nhận ký gửi (Mục 12)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-[#717971] space-y-2">
                    <span className="material-symbols-outlined text-4xl text-[#DDE5D9]">qr_code_scanner</span>
                    <p className="text-xs">Chưa có sản phẩm nào được nhập quầy trong phiên này.</p>
                  </div>
                )}
              </div>

              {/* Thông tin quy chế kho */}
              <div className="bg-white p-5 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-2.5 text-xs text-[#414942]">
                <h4 className="font-bold text-[#191C19] flex items-center space-x-1.5">
                  <span className="material-symbols-outlined text-sm text-[#006B2C]">verified_user</span>
                  <span>Quy định kiểm định tại quầy:</span>
                </h4>
                <p>• Moderator thuộc đúng một kho, chỉ nhập hàng vào chi nhánh kho mình phụ trách.</p>
                <p>• Hàng không đạt tiêu chuẩn độ mới hoặc nghi giả phải trả ngay tại chỗ, không lưu kho.</p>
                <p>• Biên nhận ký gửi có hiệu lực ngay khi Member xác nhận trên ứng dụng điện thoại.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Bàn giao hàng tại quầy (F-129, UC-66) */}
        {activeTab === 'HANDOVER' && (
          <div className="bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#191C19]">Hàng Chờ Bàn Giao Cho Khách Tại Quầy</h3>
              <p className="text-xs text-[#717971]">
                Dành cho người bán rút lại hàng ký gửi hoặc người mua nhận lại hàng trả không hợp lệ
              </p>
            </div>

            <div className="divide-y divide-[#F0F4EE]">
              {handoverQueue.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#191C19]">{item.item}</span>
                      <span className="font-mono text-xs text-[#006B2C] font-semibold">[{item.sku}]</span>
                      <Badge variant="warning">{item.type}</Badge>
                    </div>
                    <p className="text-xs text-[#414942] mt-1">
                      Người nhận: <strong>{item.memberName}</strong> ({item.memberCode}) • Hạn nhận: <span className="text-[#D97706] font-semibold">{item.deadline}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-[#006B2C] text-white text-xs"
                      onClick={() => handleHandoverItem(item.id)}
                    >
                      <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
                      Xác nhận đã giao hàng
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal in tem SKU */}
        <BarcodePrintModal
          isOpen={!!printLabelItem}
          onClose={() => setPrintLabelItem(null)}
          item={printLabelItem}
        />

        {/* Modal biên nhận ký gửi Mục 12 */}
        <ConsignmentReceiptModal
          isOpen={!!receiptItem}
          onClose={() => setReceiptItem(null)}
          receipt={receiptItem}
        />
      </div>
    </ModeratorLayout>
  );
}
