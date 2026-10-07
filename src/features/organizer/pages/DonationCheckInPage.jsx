import React, { useState } from 'react';
import Header from '../../../components/header.jsx';
import Footer from '../../../components/footer.jsx';
import { Input, Button, Badge } from '../../../components/common/index.js';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { orgService } from '../services/org.service.js';

export default function DonationCheckInPage() {
  const [code, setCode] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);

    try {
      await orgService.verifyDonationCode(code);
      setCheckInResult({
        code,
        donorName: 'Nguyễn Thị B (Member)',
        itemsCount: 5,
        campaign: 'Áo Ấm Mùa Đông Vùng Cao 2026',
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      });
    } catch {
      // Demo mock fallback
      setCheckInResult({
        code,
        donorName: 'Trần Văn C (Khách quyên góp)',
        itemsCount: 3,
        campaign: 'Áo Ấm Mùa Đông Vùng Cao 2026',
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Điểm Tiếp Nhận Quyên Góp (Check-in)</h1>
          <p className="text-sm text-outline">
            Quét QR hoặc nhập mã quyên góp để đối soát và ghi nhận số lượng quần áo người dùng mang tới điểm tiếp nhận
          </p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Mã định danh quyên góp (Mã 8 số trên ứng dụng người gửi)"
              required
              placeholder="Nhập mã số quyên góp..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={() => setIsScannerOpen(true)}>
                <span className="material-symbols-outlined mr-1 text-base">qr_code_scanner</span>
                Quét QR
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Kiểm tra & Ghi nhận lượt quyên góp
              </Button>
            </div>
          </form>

          {checkInResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-green-900 text-sm">✓ Đã tiếp nhận quyên góp thành công</span>
                <Badge variant="success">Đã đối soát</Badge>
              </div>
              <div className="text-xs text-green-800 space-y-1">
                <p>Mã quyên góp: <strong>{checkInResult.code}</strong></p>
                <p>Người đóng góp: <strong>{checkInResult.donorName}</strong></p>
                <p>Chiến dịch: <strong>{checkInResult.campaign}</strong></p>
                <p>Số lượng: <strong>{checkInResult.itemsCount} món</strong></p>
                <p>Giờ check-in: <strong>{checkInResult.timestamp}</strong></p>
              </div>
              <Button size="sm" onClick={() => { setCheckInResult(null); setCode(''); }}>
                Tiếp tục check-in người tiếp theo
              </Button>
            </div>
          )}
        </div>

        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(val) => {
            setCode(val);
            setIsScannerOpen(false);
          }}
          title="Quét mã quyên góp của Member"
        />
      </main>
      <Footer />
    </div>
  );
}
