import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import QRScannerModal from '../../../components/QRScannerModal.jsx';

/**
 * Trang Đóng Gói Xuất Kho & Tạo Vận Đơn GHN (F-127, F-128, UC-65)
 * Moderator quét mã SKU trên kệ đối chiếu món đồ, chụp ảnh niêm phong kiện hàng và sinh mã vận đơn GHN
 */
export default function PackingOrdersPage() {
  const [orders, setOrders] = useState([
    {
      id: 'ORD-9912',
      buyerName: 'Lê Thu Trang',
      buyerPhone: '0912 881 294',
      shippingAddress: 'Tòa nhà Bitexco, Q. 1, TP.HCM',
      itemName: 'Áo blazer tweed Zara',
      sku: 'Q7-BL-000192',
      shelfLocation: 'Kệ A2 - Tầng 2',
      price: 350000,
      status: 'PENDING_PACK', // 'PENDING_PACK' | 'READY_FOR_PICKUP'
      trackingCode: null,
      packagingPhoto: null,
    },
    {
      id: 'ORD-9884',
      buyerName: 'Phạm Hoàng',
      buyerPhone: '0988 231 002',
      shippingAddress: 'Số 14 Lê Văn Sỹ, P. 13, Q. 3, TP.HCM',
      itemName: 'Quần jean Levi\'s 501 Original',
      sku: 'Q7-QN-000312',
      shelfLocation: 'Kệ B1 - Tầng 1',
      price: 750000,
      status: 'READY_FOR_PICKUP',
      trackingCode: 'GHN-892128-VN',
      packagingPhoto: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [scannedSku, setScannedSku] = useState('');
  const [skuMatched, setSkuMatched] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [creatingGHN, setCreatingGHN] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleOpenPackModal = (order) => {
    setSelectedOrder(order);
    setScannedSku('');
    setSkuMatched(false);
    setPhotoUrl('');
  };

  const handleVerifySku = (skuValue) => {
    setScannedSku(skuValue);
    if (skuValue.trim().toUpperCase() === selectedOrder?.sku) {
      setSkuMatched(true);
    } else {
      setSkuMatched(false);
      alert(`⚠️ Mã SKU [${skuValue}] không khớp với món đồ của đơn hàng này! Yêu cầu SKU: [${selectedOrder?.sku}].`);
    }
  };

  const handleConfirmPackAndShip = () => {
    if (!skuMatched) {
      alert('Vui lòng quét đúng mã SKU sản phẩm để đối chiếu!');
      return;
    }
    if (!photoUrl) {
      alert('Bắt buộc tải ảnh chụp kiện hàng đã đóng gói niêm phong!');
      return;
    }

    setCreatingGHN(true);
    setTimeout(() => {
      setCreatingGHN(false);
      const generatedGHN = `GHN-${Math.floor(100000 + Math.random() * 900000)}-VN`;
      setOrders(orders.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              status: 'READY_FOR_PICKUP',
              trackingCode: generatedGHN,
              packagingPhoto: photoUrl,
            }
          : o
      ));
      alert(`Đã tạo vận đơn GHN thành công! Mã vận đơn: ${generatedGHN}. Chờ bưu tá GHN đến lấy.`);
      setSelectedOrder(null);
    }, 700);
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
              Xuất kho GHN • F-127, UC-65
            </span>
            <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
              Đóng Gói Xuất Kho & Tạo Vận Đơn GHN
            </h1>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Quy trình bắt buộc: Lấy hàng từ kệ kho → Quét SKU đối chiếu chống nhầm hàng → Chụp ảnh đóng gói → Sinh mã GHN.
          </p>
        </div>

        {/* Danh sách đơn cần xuất kho */}
        <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-sm divide-y divide-[#F0F4EE]">
          {orders.map((o) => (
            <div key={o.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-[#191C19]">#{o.id}</span>
                  <span className="font-mono text-xs text-[#006B2C] font-bold">[{o.sku}]</span>
                  {o.status === 'PENDING_PACK' ? (
                    <Badge variant="warning">Chờ đóng gói & Quét SKU</Badge>
                  ) : (
                    <Badge variant="success">Đã tạo GHN: {o.trackingCode}</Badge>
                  )}
                </div>
                <p className="font-bold text-xs text-[#191C19]">{o.itemName}</p>
                <p className="text-xs text-[#414942]">
                  Vị trí kệ: <strong className="text-[#006B2C]">📍 {o.shelfLocation}</strong> • Người nhận: {o.buyerName} ({o.buyerPhone})
                </p>
                <p className="text-[11px] text-[#717971]">Địa chỉ giao: {o.shippingAddress}</p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {o.status === 'PENDING_PACK' ? (
                  <Button
                    size="sm"
                    className="bg-[#006B2C] hover:bg-[#005221] text-white text-xs"
                    onClick={() => handleOpenPackModal(o)}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">inventory_2</span>
                    Đóng gói & Quét SKU (F-127)
                  </Button>
                ) : (
                  <div className="text-right">
                    <span className="text-[11px] text-[#00685F] font-bold block">✓ Chờ bưu tá GHN lấy</span>
                    <a
                      href={`https://tracking.ghn.vn/?code=${o.trackingCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-600 hover:underline inline-flex items-center"
                    >
                      Kiểm tra GHN Sandbox →
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal đóng gói & Quét đối chiếu SKU */}
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Quy trình đóng gói đơn hàng #${selectedOrder?.id}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-[#F0F5EE] rounded-xl border border-[#C8E6C9] text-xs">
              <p><strong>Sản phẩm:</strong> {selectedOrder?.itemName}</p>
              <p><strong>Vị trí kệ lấy đồ:</strong> {selectedOrder?.shelfLocation}</p>
              <p><strong>Mã SKU bắt buộc khớp:</strong> <span className="font-mono font-bold text-[#006B2C]">{selectedOrder?.sku}</span></p>
            </div>

            {/* Bước 1: Quét SKU */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#191C19]">
                Bước 1: Quét hoặc nhập mã SKU dán trên tem áo (Chống gửi nhầm hàng):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã SKU trên tem sản phẩm..."
                  value={scannedSku}
                  onChange={(e) => setScannedSku(e.target.value)}
                  className={`flex-1 p-2.5 rounded-xl border text-xs font-mono uppercase ${
                    skuMatched ? 'border-[#006B2C] bg-[#E8F5E9] text-[#006B2C] font-bold' : 'border-[#DDE5D9] bg-white text-[#191C19]'
                  }`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerifySku(scannedSku)}
                >
                  Đối chiếu
                </Button>
                <Button
                  size="sm"
                  className="bg-[#006B2C] text-white"
                  onClick={() => setIsScannerOpen(true)}
                >
                  <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                </Button>
              </div>
              {skuMatched && (
                <p className="text-[11px] text-[#006B2C] font-bold">✓ Mã SKU hoàn toàn chính xác!</p>
              )}
            </div>

            {/* Bước 2: Tải ảnh kiện hàng đóng gói */}
            <div className="space-y-2 pt-2 border-t border-[#DDE5D9]">
              <label className="block text-xs font-semibold text-[#191C19]">
                Bước 2: Ảnh chụp kiện hàng niêm phong:
              </label>
              {photoUrl ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#DDE5D9]">
                  <img src={photoUrl} alt="Kiện hàng" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotoUrl('')}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-[#DDE5D9] rounded-xl p-4 text-center bg-[#F8FAF8] space-y-2">
                  <span className="material-symbols-outlined text-3xl text-[#717971]">add_a_photo</span>
                  <p className="text-xs text-[#717971]">Chụp ảnh kiện hàng đã bọc chống sốc và dán tem</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPhotoUrl('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500')}
                  >
                    Mô phỏng chụp ảnh kiện hàng
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#DDE5D9]">
              <Button variant="ghost" onClick={() => setSelectedOrder(null)}>Hủy</Button>
              <Button
                disabled={!skuMatched || !photoUrl}
                loading={creatingGHN}
                onClick={handleConfirmPackAndShip}
                className="bg-[#006B2C] text-white text-xs"
              >
                Tạo vận đơn GHN & Hoàn tất đóng gói
              </Button>
            </div>
          </div>
        </Modal>

        {/* QR Scanner Modal */}
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(code) => {
            handleVerifySku(code);
            setIsScannerOpen(false);
          }}
        />
      </div>
    </ModeratorLayout>
  );
}
