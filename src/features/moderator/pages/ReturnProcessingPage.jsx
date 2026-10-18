import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import SuspiciousCounterfeitModal from '../components/SuspiciousCounterfeitModal.jsx';
import { formatCurrencyVND } from '../../../utils/formatters.js';

/**
 * Trang Xử Lý Yêu Cầu Trả Hàng & Kiểm Hàng Về Kho (F-131..F-135, UC-68)
 * Moderator kiểm tra thực tế hàng gửi trả về kho:
 * - Hợp lệ -> Hoàn tiền ví người mua, quyết định tái đăng (relist) hoặc trả người bán
 * - Không hợp lệ (tráo hàng, sai khác) -> Không hoàn tiền, giữ hàng 7 ngày cho khách đến lấy
 * - Nghi hàng giả -> Kích hoạt quy trình F-134 hội chẩn 2 Moderator độc lập
 */
export default function ReturnProcessingPage() {
  const [returnRequests, setReturnRequests] = useState([
    {
      id: 'RET-3012',
      orderId: 'ORD-9821',
      buyerName: 'Trần Minh Thảo',
      buyerPhone: '0908 112 344',
      itemName: 'Áo khoác gió thể thao Adidas',
      brand: 'Adidas',
      sku: 'Q7-AK-000411',
      amount: 450000,
      reason: 'Nghi ngờ hàng nhái, logo và đường may cẩu thả, chất vải không đúng',
      photoEvidence: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500',
      status: 'SUSPECTED_COUNTERFEIT', // 'PENDING_INSPECT' | 'SUSPECTED_COUNTERFEIT' | 'RESOLVED'
      carrierStatus: 'Đã giao về kho Q7 (15/10/2026)',
    },
    {
      id: 'RET-3015',
      orderId: 'ORD-9774',
      buyerName: 'Nguyễn Văn Đạt',
      buyerPhone: '0977 441 209',
      itemName: 'Quần tây công sở Novelty',
      brand: 'Novelty',
      sku: 'Q7-QT-000188',
      amount: 280000,
      reason: 'Có khuyết điểm vết ố sau lưng áo không như mô tả',
      photoEvidence: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
      status: 'PENDING_INSPECT',
      carrierStatus: 'Đã giao về kho Q7 (14/10/2026)',
    },
  ]);

  const [counterfeitModalItem, setCounterfeitModalItem] = useState(null);

  const handleValidReturn = (retId, outcome) => {
    // outcome: 'RELIST' | 'RETURN_SELLER'
    setReturnRequests(returnRequests.map((r) =>
      r.id === retId ? { ...r, status: 'RESOLVED', outcome } : r
    ));
    alert(`Đã duyệt trả hàng hợp lệ! Hệ thống tự động hoàn 100% tiền đơn vào ví người mua và ghi nhận trạng thái hàng: ${outcome === 'RELIST' ? 'Đăng bán lại' : 'Trả người bán'}.`);
  };

  const handleInvalidReturn = (retId) => {
    setReturnRequests(returnRequests.map((r) =>
      r.id === retId ? { ...r, status: 'RESOLVED', outcome: 'INVALID_RETURN' } : r
    ));
    alert('Đã kết luận TRẢ HÀNG KHÔNG HỢP LỆ! Không hoàn tiền cho người mua. Hàng được lưu kho 7 ngày để người mua tự đến lấy hoặc chịu phí ship gửi lại (Mục 6 L-05).');
  };

  const handleVerdictSuccess = (verdictData) => {
    setReturnRequests(returnRequests.map((r) =>
      r.id === verdictData.itemId ? { ...r, status: 'RESOLVED', outcome: verdictData.verdict } : r
    ));
    alert(`Đã hoàn tất hội chẩn 2 Moderator! Kết luận: ${verdictData.verdict === 'COUNTERFEIT' ? 'HÀNG GIẢ - Tiêu hủy và hoàn tiền người mua' : 'HÀNG CHÍNH HÃNG'}. Lưu vào Audit Log.`);
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
              Kiểm định hàng trả • UC-68
            </span>
            <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
              Xử Lý Yêu Cầu Trả Hàng & Thẩm Định Hàng Trả
            </h1>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Kiểm tra tình trạng hàng hóa khi GHN giao trả về kho. Trường hợp nghi hàng giả bắt buộc thẩm định chéo với Moderator thứ 2.
          </p>
        </div>

        {/* Danh sách yêu cầu trả */}
        <div className="space-y-4">
          {returnRequests.map((r) => (
            <div
              key={r.id}
              className={`p-6 rounded-2xl border bg-white shadow-sm flex flex-col lg:flex-row gap-5 justify-between transition-all ${
                r.status === 'SUSPECTED_COUNTERFEIT' ? 'border-[#FED7AA] bg-[#FFFDFB]' : 'border-[#DDE5D9]'
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <img
                  src={r.photoEvidence}
                  alt={r.itemName}
                  className="w-28 h-32 object-cover rounded-xl border border-[#DDE5D9] shrink-0"
                />
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-[#191C19]">{r.itemName}</span>
                    <span className="font-mono text-xs text-[#006B2C] font-bold">[{r.sku}]</span>
                    {r.status === 'SUSPECTED_COUNTERFEIT' && (
                      <Badge variant="danger">⚠️ Nghi hàng giả (Cần 2 Mod)</Badge>
                    )}
                    {r.status === 'PENDING_INSPECT' && (
                      <Badge variant="warning">Chờ kiểm tra hàng về</Badge>
                    )}
                    {r.status === 'RESOLVED' && (
                      <Badge variant="success">Đã giải quyết ({r.outcome})</Badge>
                    )}
                  </div>

                  <p className="text-[#414942]">
                    Đơn hàng: <strong>#{r.orderId}</strong> • Người mua: <strong>{r.buyerName}</strong> ({r.buyerPhone})
                  </p>
                  <p className="text-[#414942]">
                    Giá trị hoàn tiền: <strong className="text-[#006B2C]">{formatCurrencyVND(r.amount)}</strong>
                  </p>
                  <p className="text-[#BA1A1A] font-medium bg-[#FFDAD6]/30 p-2 rounded-lg inline-block">
                    Lý do người mua yêu cầu: "{r.reason}"
                  </p>
                  <p className="text-[11px] text-[#717971]">
                    Vận chuyển trả: <strong className="text-[#00685F]">{r.carrierStatus}</strong>
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              {r.status !== 'RESOLVED' && (
                <div className="flex flex-col sm:flex-row lg:flex-col justify-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                  {r.status === 'SUSPECTED_COUNTERFEIT' ? (
                    <Button
                      className="bg-[#BA1A1A] hover:bg-[#93000A] text-white text-xs whitespace-nowrap"
                      onClick={() => setCounterfeitModalItem(r)}
                    >
                      <span className="material-symbols-outlined text-sm mr-1">gavel</span>
                      Hội chẩn 2 Moderator
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="bg-[#006B2C] text-white text-xs"
                        onClick={() => handleValidReturn(r.id, 'RELIST')}
                      >
                        Hợp lệ • Hoàn tiền & Đăng bán lại
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleValidReturn(r.id, 'RETURN_SELLER')}
                      >
                        Hợp lệ • Hoàn tiền & Trả người bán
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleInvalidReturn(r.id)}
                      >
                        Kết luận không hợp lệ (Không hoàn)
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal hội chẩn 2 mod */}
        <SuspiciousCounterfeitModal
          isOpen={!!counterfeitModalItem}
          onClose={() => setCounterfeitModalItem(null)}
          returnItem={counterfeitModalItem}
          onConfirmVerdict={handleVerdictSuccess}
        />
      </div>
    </ModeratorLayout>
  );
}
