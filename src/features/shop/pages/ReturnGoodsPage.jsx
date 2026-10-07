import React, { useState } from 'react';
import ShopLayout from '../../../layouts/ShopLayout.jsx';
import { Input, Button, Modal } from '../../../components/common/index.js';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import PayOSForm from '../components/PayOSForm.jsx';
import { validateCode } from '../../../utils/validators.js';

export default function ReturnGoodsPage() {
  const [returnCode, setReturnCode] = useState('');
  const [error, setError] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const selectedReceiptForSettlement = {
    id: 'REC-108294',
    code: 'REC-108294',
    sellingPrice: 320000,
  };

  const handleVerifyReturn = (e) => {
    e.preventDefault();
    const err = validateCode(returnCode, 6);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setSuccessInfo({
      code: returnCode,
      item: 'Áo khoác Blazer Uniqlo màu be',
      owner: 'Nguyễn Văn A (Member ID: 84920194)',
      time: new Date().toLocaleTimeString('vi-VN'),
    });
  };

  return (
    <ShopLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Trả Đồ & Tất Toán Bán Ngoài Sàn</h1>
          <p className="text-sm text-outline">
            Quét mã 6 số nhận đồ của Member để hoàn tất trả hàng, hoặc thực hiện tất toán PayOS trong 48 giờ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Return goods via 6-digit code */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-primary font-semibold text-base">
              <span className="material-symbols-outlined">assignment_return</span>
              <h3>1. Xác nhận trả lại đồ ký gửi</h3>
            </div>
            <p className="text-xs text-outline">
              Khi khách hàng đến quầy nhận lại đồ không bán được hoặc hết hạn 50-100 ngày.
            </p>

            {successInfo ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2 text-sm">
                <p className="font-bold text-green-800">✓ Đã đối soát mã nhận đồ thành công!</p>
                <p className="text-xs text-green-700">Món đồ: {successInfo.item}</p>
                <p className="text-xs text-green-700">Người nhận: {successInfo.owner}</p>
                <p className="text-xs text-green-700">Thời gian trả: {successInfo.time}</p>
                <Button size="sm" onClick={() => { setSuccessInfo(null); setReturnCode(''); }}>
                  Trả đồ tiếp theo
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerifyReturn} className="space-y-3">
                <Input
                  label="Mã nhận đồ 6 số của Member"
                  required
                  placeholder="Nhập 6 số..."
                  value={returnCode}
                  error={error}
                  onChange={(e) => setReturnCode(e.target.value)}
                />
                <div className="flex space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsScannerOpen(true)}>
                    Quét QR
                  </Button>
                  <Button type="submit" className="flex-1">
                    Đóng biên nhận & Trả đồ
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Card 2: Settlement via PayOS */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-secondary font-semibold text-base">
              <span className="material-symbols-outlined">payments</span>
              <h3>2. Tất toán bán ngoài sàn (PayOS)</h3>
            </div>
            <p className="text-xs text-outline">
              Nếu shop tự bán được tại quầy hoặc mua lại đồ ký gửi, bắt buộc tất toán PayOS trong 48h để chia tiền về ví Member.
            </p>

            <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1">
              <p className="font-semibold text-on-surface">Biên nhận đang chờ tất toán: #{selectedReceiptForSettlement.code}</p>
              <p className="text-outline">Trị giá: 320.000 đ | Thực nhận Member (80%): 256.000 đ</p>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setIsSettlementModalOpen(true)}
            >
              Mở cổng tất toán PayOS
            </Button>
          </div>
        </div>

        {/* Scanner Modal */}
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(code) => {
            setReturnCode(code);
            setIsScannerOpen(false);
          }}
          title="Quét mã nhận đồ 6 số"
        />

        {/* PayOS Modal */}
        <Modal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          title="Tất Toán Biên Nhận Qua Cổng PayOS"
        >
          <PayOSForm
            receipt={selectedReceiptForSettlement}
            onSubmit={(data) => {
              alert('Đã gửi yêu cầu tất toán PayOS thành công cho Member!');
              setIsSettlementModalOpen(false);
            }}
            onCancel={() => setIsSettlementModalOpen(false)}
          />
        </Modal>
      </div>
    </ShopLayout>
  );
}
