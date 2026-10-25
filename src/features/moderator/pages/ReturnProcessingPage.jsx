import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import SuspiciousCounterfeitModal from '../components/SuspiciousCounterfeitModal.jsx';
import { formatCurrencyVND } from '../../../utils/formatters.js';

import { returnService } from '../services/moderatorMockData.js';

/**
 * Trang Xử Lý Yêu Cầu Trả Hàng & Kiểm Hàng Về Kho (F-131..F-135, UC-68)
 * Moderator kiểm tra thực tế hàng gửi trả về kho:
 * - Hợp lệ -> Hoàn tiền ví người mua, quyết định tái đăng (relist) hoặc trả người bán
 * - Không hợp lệ (tráo hàng, sai khác) -> Không hoàn tiền, giữ hàng 7 ngày cho khách đến lấy
 * - Nghi hàng giả -> Kích hoạt quy trình F-134 hội chẩn 2 Moderator độc lập
 */
export default function ReturnProcessingPage() {
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counterfeitModalItem, setCounterfeitModalItem] = useState(null);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await returnService.list();
      setReturnRequests(res.data);
    } catch (err) {
      setError('Không thể tải danh sách yêu cầu trả hàng.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReturns();
  }, []);

  const handleValidReturn = async (retId, outcome) => {
    try {
      await returnService.resolveValid(retId, outcome);
      setReturnRequests((prev) =>
        prev.map((r) => (r.id === retId ? { ...r, status: 'RESOLVED', outcome } : r))
      );
      alert(`Đã duyệt trả hàng hợp lệ! Hệ thống tự động hoàn 100% tiền đơn vào ví người mua và ghi nhận trạng thái hàng: ${outcome === 'RELIST' ? 'Đăng bán lại' : 'Trả người bán'}.`);
    } catch (err) {
      alert('Có lỗi xảy ra khi duyệt trả hàng.');
    }
  };

  const handleInvalidReturn = async (retId) => {
    try {
      await returnService.resolveInvalid(retId);
      setReturnRequests((prev) =>
        prev.map((r) => (r.id === retId ? { ...r, status: 'RESOLVED', outcome: 'INVALID_RETURN' } : r))
      );
      alert('Đã kết luận TRẢ HÀNG KHÔNG HỢP LỆ! Không hoàn tiền cho người mua. Hàng được lưu kho 7 ngày để người mua tự đến lấy hoặc chịu phí ship gửi lại (Mục 6 L-05).');
    } catch (err) {
      alert('Có lỗi xảy ra khi ghi nhận trả hàng không hợp lệ.');
    }
  };

  const handleVerdictSuccess = async (verdictData) => {
    try {
      if (verdictData.verdict === 'COUNTERFEIT') {
        await returnService.resolveInvalid(verdictData.itemId);
      } else {
        await returnService.resolveValid(verdictData.itemId, 'RELIST');
      }
      setReturnRequests((prev) =>
        prev.map((r) =>
          r.id === verdictData.itemId ? { ...r, status: 'RESOLVED', outcome: verdictData.verdict } : r
        )
      );
      alert(`Đã hoàn tất hội chẩn 2 Moderator! Kết luận: ${verdictData.verdict === 'COUNTERFEIT' ? 'HÀNG GIẢ - Tiêu hủy và hoàn tiền người mua' : 'HÀNG CHÍNH HÃNG'}. Lưu vào Audit Log.`);
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu biên bản hội chẩn.');
    }
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
              Kiểm định hàng trả
            </span>
            <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
              Xử Lý Yêu Cầu Trả Hàng & Thẩm Định Hàng Trả
            </h1>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Kiểm tra tình trạng hàng hóa khi GHN giao trả về kho. Trường hợp nghi hàng giả bắt buộc thẩm định chéo với Moderator thứ 2.
          </p>
        </div>

        {/* Trạng thái tải / Lỗi / Rỗng */}
        {loading && (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#DDE5D9] text-[#717971] text-sm">
            <span className="material-symbols-outlined animate-spin text-2xl mb-2 block">progress_activity</span>
            Đang tải danh sách yêu cầu trả hàng...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-[#FFDAD6]/40 border border-[#BA1A1A]/30 text-[#BA1A1A] text-xs flex justify-between items-center">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchReturns}>Thử lại</Button>
          </div>
        )}

        {!loading && !error && returnRequests.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#DDE5D9] text-[#717971]">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#717971]">assignment_turned_in</span>
            <p className="font-bold text-sm text-[#191C19]">Không có yêu cầu trả hàng nào cần xử lý</p>
            <p className="text-xs mt-1">Tất cả kiện hàng hoàn về kho đã được kiểm tra và xử lý xong.</p>
          </div>
        )}

        {/* Danh sách yêu cầu trả */}
        {!loading && (
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
        )}

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
