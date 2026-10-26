import React, { useState, useEffect } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { returnService } from '../services/moderatorMockData.js';

/**
 * Trang Xử Lý Yêu Cầu Trả Hàng & Kiểm Tra Hàng Về Kho
 * Chuẩn hóa 100% theo các wireframe:
 * - TH-01: Hàng đợi yêu cầu trả hàng
 * - TH-02: Chi tiết yêu cầu trả & duyệt form
 * - TH-03: Kiểm tra hàng trả về kho (checklist đối chiếu SKU & ảnh nhập kho)
 * - TH-04: Xử lý món hàng (Đăng bán lại / Trả người ký gửi)
 * - TH-08: Xác nhận hoàn tiền vào ví người mua
 */
export default function ReturnProcessingPage() {
  const [returnRequests, setReturnRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING_APPROVAL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Navigation states: 'QUEUE' | 'REVIEW' (TH-02) | 'INSPECT' (TH-03)
  const [viewMode, setViewMode] = useState('QUEUE');
  const [selectedItem, setSelectedItem] = useState(null);

  // TH-02 Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // TH-03 Inspection states
  const [scannedSku, setScannedSku] = useState('');
  const [skuMatched, setSkuMatched] = useState(false);
  const [checklist, setChecklist] = useState({
    skuCorrect: false,
    labelIntact: false,
    noNewDamage: false,
    noUsageSign: false,
    accessoriesComplete: false,
  });
  const [inspectionVerdict, setInspectionVerdict] = useState(''); // 'VALID' | 'INVALID'
  const [invalidReason, setInvalidReason] = useState('');

  // TH-04 Outcome Modal (Relist vs Return Seller)
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);

  // Compare side-by-side modal
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

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

  useEffect(() => {
    fetchReturns();
  }, []);

  const tabCounts = {
    PENDING_APPROVAL: returnRequests.filter((r) => r.status === 'PENDING_APPROVAL').length,
    WAITING_BUYER_DISPATCH: returnRequests.filter((r) => r.status === 'WAITING_BUYER_DISPATCH').length,
    RETURNING: returnRequests.filter((r) => r.status === 'RETURNING').length,
    RECEIVED_INSPECT: returnRequests.filter((r) => r.status === 'RECEIVED_INSPECT').length,
    RESOLVED: returnRequests.filter((r) => r.status === 'RESOLVED').length,
  };

  const filteredRequests = returnRequests.filter((r) => {
    if (r.status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.code.toLowerCase().includes(q) ||
      r.orderId.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.buyerName.toLowerCase().includes(q)
    );
  });

  const handleOpenReview = (item) => {
    setSelectedItem(item);
    setViewMode('REVIEW');
  };

  const handleOpenInspect = (item) => {
    setSelectedItem(item);
    setScannedSku(item.sku);
    setSkuMatched(true);
    setChecklist({
      skuCorrect: true,
      labelIntact: true,
      noNewDamage: false,
      noUsageSign: false,
      accessoriesComplete: true,
    });
    setInspectionVerdict('');
    setInvalidReason('');
    setViewMode('INSPECT');
  };

  const handleApproveAndCreateWaybill = async () => {
    if (!selectedItem) return;
    try {
      await returnService.approveReturnAndCreateWaybill(selectedItem.id);
      await fetchReturns();
      alert(`Đã duyệt yêu cầu trả hàng ${selectedItem.code}! Vận đơn thu hồi GHN đã được tự động tạo và gửi tới người mua.`);
      setViewMode('QUEUE');
      setSelectedItem(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi duyệt yêu cầu.');
    }
  };

  const handleConfirmRejectRequest = async () => {
    if (!rejectReason.trim() || !selectedItem) return;
    try {
      await returnService.rejectReturn(selectedItem.id, rejectReason);
      await fetchReturns();
      setIsRejectModalOpen(false);
      setRejectReason('');
      setViewMode('QUEUE');
      setSelectedItem(null);
      alert(`Đã từ chối yêu cầu trả hàng ${selectedItem.code}. Thông báo kèm lý do đã gửi tới người mua.`);
    } catch (err) {
      alert('Có lỗi xảy ra khi từ chối yêu cầu.');
    }
  };

  const handleSaveInspection = async () => {
    if (!selectedItem || !inspectionVerdict) return;
    if (inspectionVerdict === 'INVALID') {
      if (!invalidReason.trim()) {
        alert('Vui lòng nhập lý do kết luận không hợp lệ.');
        return;
      }
      try {
        await returnService.resolveInvalid(selectedItem.id, invalidReason);
        await fetchReturns();
        alert('Đã lưu kết luận: TRẢ HÀNG KHÔNG HỢP LỆ. Hàng được lưu kho 7 ngày để người mua tự đến nhận lại hoặc thanh toán phí ship.');
        setViewMode('QUEUE');
        setSelectedItem(null);
      } catch (err) {
        alert('Có lỗi xảy ra khi lưu kết luận.');
      }
    } else {
      // Hợp lệ -> mở modal TH-04 để chọn Relist hay Return Seller
      setIsOutcomeModalOpen(true);
    }
  };

  const handleConfirmOutcome = async (outcome) => {
    if (!selectedItem) return;
    try {
      await returnService.resolveValid(selectedItem.id, outcome);
      await fetchReturns();
      setIsOutcomeModalOpen(false);
      setViewMode('QUEUE');
      setSelectedItem(null);
      alert(
        `Đã hoàn tất xử lý trả hàng! Hệ thống tự động hoàn ${formatCurrencyVND(
          selectedItem.amount + selectedItem.shippingFee
        )} vào ví người mua ReHome và chuyển hàng sang trạng thái: ${
          outcome === 'RELIST' ? 'Đăng bán lại' : 'Trả người ký gửi'
        }.`
      );
    } catch (err) {
      alert('Có lỗi xảy ra khi xác nhận phương án.');
    }
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        {/* VIEW 1: QUEUE (TH-01) */}
        {viewMode === 'QUEUE' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E2E8E0] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold font-heading text-[#191C19]">
                    Yêu cầu trả hàng
                  </h1>
                </div>
                <p className="text-xs text-[#5f5f5f] mt-1">
                  Sắp theo hạn xử lý, sắp quá hạn lên trước. Người mua đang chờ tiền — để lâu là một khiếu nại.
                </p>
              </div>
              <div className="text-xs text-[#5f5f5f] font-medium">
                Hạn duyệt: 1 ngày làm việc kể từ khi nhận yêu cầu
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('PENDING_APPROVAL')}
                className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${
                  activeTab === 'PENDING_APPROVAL'
                    ? 'bg-[#2b2b2b] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8] hover:bg-[#F0F5EE]'
                }`}
              >
                Chờ duyệt · {tabCounts.PENDING_APPROVAL}
              </button>
              <button
                onClick={() => setActiveTab('WAITING_BUYER_DISPATCH')}
                className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${
                  activeTab === 'WAITING_BUYER_DISPATCH'
                    ? 'bg-[#2b2b2b] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8] hover:bg-[#F0F5EE]'
                }`}
              >
                Chờ người mua gửi · {tabCounts.WAITING_BUYER_DISPATCH}
              </button>
              <button
                onClick={() => setActiveTab('RETURNING')}
                className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${
                  activeTab === 'RETURNING'
                    ? 'bg-[#2b2b2b] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8] hover:bg-[#F0F5EE]'
                }`}
              >
                Đang về kho · {tabCounts.RETURNING}
              </button>
              <button
                onClick={() => setActiveTab('RECEIVED_INSPECT')}
                className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${
                  activeTab === 'RECEIVED_INSPECT'
                    ? 'bg-[#2b2b2b] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8] hover:bg-[#F0F5EE]'
                }`}
              >
                Hàng đã về, chờ kiểm · {tabCounts.RECEIVED_INSPECT}
              </button>
              <button
                onClick={() => setActiveTab('RESOLVED')}
                className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${
                  activeTab === 'RESOLVED'
                    ? 'bg-[#2b2b2b] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8] hover:bg-[#F0F5EE]'
                }`}
              >
                Đã xong tuần này · {tabCounts.RESOLVED}
              </button>
            </div>

            {/* Bảng TH-01 */}
            <div className="bg-white border border-[#8a8a8a] rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] uppercase font-bold text-[#5f5f5f] tracking-wider">
                      <th className="py-2.5 px-3">Mã yêu cầu</th>
                      <th className="py-2.5 px-3">Người mua</th>
                      <th className="py-2.5 px-3">Số món</th>
                      <th className="py-2.5 px-3">Lý do</th>
                      <th className="py-2.5 px-3">Gửi lúc</th>
                      <th className="py-2.5 px-3">Đã chờ</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {loading && (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-[#717971]">
                          Đang tải danh sách yêu cầu trả hàng...
                        </td>
                      </tr>
                    )}
                    {!loading && filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-[#717971]">
                          Không có yêu cầu trả hàng nào trong mục này.
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      filteredRequests.map((r) => {
                        const isOverdueItem = r.isOverdue && activeTab === 'PENDING_APPROVAL';
                        return (
                          <tr
                            key={r.id}
                            className={`hover:bg-[#F8FAF8] transition-colors ${
                              isOverdueItem ? 'border-l-4 border-l-[#2b2b2b] bg-[#fafafa]' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-bold text-[#191C19]">{r.code}</td>
                            <td className="py-3 px-3">{r.buyerName}</td>
                            <td className="py-3 px-3">{r.itemCount} món</td>
                            <td className="py-3 px-3 text-[#4a4a4a] max-w-[200px] truncate" title={r.reason}>
                              {r.reason}
                            </td>
                            <td className="py-3 px-3 text-[#5f5f5f]">{r.submittedAt}</td>
                            <td className={`py-3 px-3 ${isOverdueItem ? 'font-bold text-[#BA1A1A]' : 'text-[#5f5f5f]'}`}>
                              {r.waitTime}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-[#191C19]">
                                {r.status === 'PENDING_APPROVAL' && 'Chờ duyệt'}
                                {r.status === 'WAITING_BUYER_DISPATCH' && 'Chờ người mua gửi'}
                                {r.status === 'RETURNING' && 'Đang về kho'}
                                {r.status === 'RECEIVED_INSPECT' && 'Hàng đã về, chờ kiểm'}
                                {r.status === 'RESOLVED' && 'Đã xong'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                              {r.status === 'PENDING_APPROVAL' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(r)}
                                  className="text-[10px] font-bold px-3 py-1.5 rounded bg-[#2b2b2b] text-white hover:bg-black transition-colors"
                                >
                                  Duyệt yêu cầu
                                </button>
                              )}
                              {r.status === 'RECEIVED_INSPECT' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInspect(r)}
                                  className="text-[10px] font-bold px-3 py-1.5 rounded border border-[#2b2b2b] text-[#2b2b2b] hover:bg-[#2b2b2b] hover:text-white transition-colors"
                                >
                                  Kiểm tra hàng
                                </button>
                              )}
                              {(r.status === 'RETURNING' || r.status === 'WAITING_BUYER_DISPATCH') && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(r)}
                                  className="text-[10px] px-3 py-1.5 rounded border border-[#8a8a8a] text-[#4a4a4a] hover:bg-[#f4f4f4] transition-colors"
                                >
                                  Theo dõi
                                </button>
                              )}
                              {r.status === 'RESOLVED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(r)}
                                  className="text-[10px] px-2.5 py-1 rounded border border-[#c4c4c4] text-[#717971]"
                                >
                                  Chi tiết
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note box TH-01 */}
            <div className="p-3 border border-dashed border-[#9a9a9a] rounded-lg text-xs leading-relaxed text-[#4a4a4a] bg-[#fafafa]">
              Cột <strong className="font-semibold text-[#191C19]">Đã chờ</strong> chỉ đếm ở hai tab đầu — những bước phụ thuộc người mua hoặc đơn vị vận chuyển thì kho không kiểm soát được thời gian, đếm ở đó chỉ gây áp lực sai chỗ.
            </div>
          </div>
        )}

        {/* VIEW 2: CHI TIẾT DUYỆT FORM (TH-02) */}
        {viewMode === 'REVIEW' && selectedItem && (
          <div className="space-y-4">
            {/* Header TH-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('QUEUE')}
                  className="w-8 h-8 flex items-center justify-center rounded border border-[#8a8a8a] text-sm hover:bg-[#f4f4f4]"
                  title="Quay lại hàng đợi"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-[#5f5f5f]">Yêu cầu trả hàng · </span>
                  <span className="text-sm font-bold text-[#191C19]">{selectedItem.code}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedItem.isOverdue && selectedItem.status === 'PENDING_APPROVAL' && (
                  <span className="text-[10px] font-bold px-2 py-1 bg-[#2b2b2b] text-white rounded">
                    QUÁ HẠN DUYỆT 15 GIỜ
                  </span>
                )}
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#E8F5E9] text-[#006B2C]">
                  {selectedItem.carrierStatus}
                </span>
              </div>
            </div>

            {/* Bố cục 2 cột TH-02 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cột trái (7 cols): Người mua nói gì & Ảnh */}
              <div className="lg:col-span-7 space-y-4 border-r border-[#E2E8E0] pr-0 lg:pr-5">
                <div>
                  <h2 className="text-base font-bold text-[#191C19]">Người mua nói gì</h2>
                  <p className="text-xs text-[#5f5f5f]">
                    Bạn chưa thấy hàng thật. Duyệt ở đây nghĩa là <strong className="font-semibold text-[#191C19]">đáng nhận hàng về xem</strong>, không phải đồng ý hoàn tiền.
                  </p>
                </div>

                <div className="border border-[#8a8a8a] rounded-lg p-4 bg-white space-y-2">
                  <div className="flex justify-between items-baseline text-[10px] text-[#6b6b6b] uppercase tracking-wider font-semibold">
                    <span>Lý do đã chọn</span>
                    <span className="text-[#7a7a7a]">Gửi lúc {selectedItem.submittedAt}</span>
                  </div>
                  <div className="text-sm font-bold text-[#191C19]">{selectedItem.reason}</div>
                  <div className="text-xs text-[#4a4a4a] leading-relaxed bg-[#f9f9f9] p-2.5 rounded border border-[#e0e0e0]">
                    "{selectedItem.buyerNote}"
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider">
                    Ảnh người mua gửi · {selectedItem.buyerPhotos.length} ảnh
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {selectedItem.buyerPhotos.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="Ảnh người mua"
                        className="w-36 h-36 object-cover rounded border border-[#c4c4c4]"
                      />
                    ))}
                  </div>
                </div>

                <div className="border border-[#c4c4c4] rounded-lg p-4 bg-white space-y-3">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider">
                    So với ảnh kiểm định lúc nhập kho · {selectedItem.stockInDate}
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedItem.stockInPhotos.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="Ảnh nhập kho"
                        className="w-20 h-20 object-cover rounded border border-[#c4c4c4]"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsCompareModalOpen(true)}
                      className="text-xs font-semibold px-3 py-2 border border-[#8a8a8a] rounded hover:bg-[#f4f4f4]"
                    >
                      Mở so sánh<br />cạnh nhau
                    </button>
                  </div>
                  <p className="text-[10px] text-[#7a7a7a] leading-relaxed">
                    Ảnh kho tự chụp lúc nhập, là mốc chuẩn để đối chiếu — không phải ảnh người bán cung cấp.
                  </p>
                </div>
              </div>

              {/* Cột phải (5 cols): Đơn và món liên quan + Hành động */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#191C19]">Đơn và món liên quan</h2>
                  <p className="text-xs text-[#5f5f5f]">
                    Đơn #{selectedItem.orderId} · Người mua: {selectedItem.buyerName}
                  </p>
                </div>

                {/* Box món đồ */}
                <div className="border border-[#8a8a8a] rounded-lg overflow-hidden bg-white">
                  <div className="p-3 flex items-center gap-3 border-b border-[#e0e0e0]">
                    <img
                      src={selectedItem.stockInPhotos[0]}
                      alt={selectedItem.itemName}
                      className="w-12 h-14 object-cover rounded border border-[#c4c4c4]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#191C19]">{selectedItem.sku}</div>
                      <div className="text-xs text-[#5f5f5f]">{selectedItem.itemName}</div>
                      <div className="text-[10px] text-[#7a7a7a]">{selectedItem.itemDetails}</div>
                    </div>
                    <div className="text-xs font-bold text-[#191C19]">
                      {formatCurrencyVND(selectedItem.amount)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#fafafa] text-[11px] text-[#5f5f5f]">
                    Món còn lại trong đơn (nếu có) <strong className="font-semibold text-[#191C19]">không bị trả</strong>
                  </div>
                </div>

                {/* Box người ký gửi */}
                <div className="border border-[#c4c4c4] rounded-lg p-3.5 bg-white space-y-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider mb-1">
                    Người ký gửi món này
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Mã Member</span>
                    <span className="font-bold">{selectedItem.senderCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Lượt bị trả trước đây</span>
                    <span>{selectedItem.prevReturns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Tiền đã chia</span>
                    <span className="font-semibold text-[#006B2C]">{selectedItem.payoutStatus}</span>
                  </div>
                  <p className="text-[10px] text-[#7a7a7a] pt-1">
                    Tiền người ký gửi chỉ chia sau khi hết cửa sổ trả hàng. Nhờ vậy không phải đòi lại tiền đã trả.
                  </p>
                </div>

                {/* Box vận đơn trả */}
                <div className="border-2 border-[#2b2b2b] rounded-lg p-3.5 bg-white space-y-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider">
                    Vận đơn trả hàng sẽ tạo khi bấm duyệt
                  </div>
                  <div className="text-xs text-[#3a3a3a] leading-relaxed">
                    Lấy tại <strong className="font-semibold">{selectedItem.buyerName} · {selectedItem.buyerPhone}</strong>
                    <br />
                    {selectedItem.buyerAddress}
                  </div>
                  <div className="p-2 bg-[#f4f4f4] rounded text-[10px] text-[#4a4a4a]">
                    Địa chỉ do người mua nhập. Bấm duyệt là GHN nhận thông tin này và <strong className="font-semibold">hai bên đều không sửa được nữa</strong> — đọc lại trước khi bấm.
                  </div>
                </div>

                {/* Footer Buttons */}
                {selectedItem.status === 'PENDING_APPROVAL' && (
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleApproveAndCreateWaybill}
                      className="flex-1 py-2.5 px-4 rounded bg-[#2b2b2b] text-white text-xs font-bold hover:bg-black transition-colors"
                    >
                      Duyệt & tạo vận đơn trả
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRejectModalOpen(true)}
                      className="py-2.5 px-4 rounded border border-[#8a8a8a] text-xs font-semibold hover:bg-[#f4f4f4]"
                    >
                      Từ chối yêu cầu
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: KIỂM TRA HÀNG VỀ KHO (TH-03) */}
        {viewMode === 'INSPECT' && selectedItem && (
          <div className="space-y-4">
            {/* Header TH-03 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('QUEUE')}
                  className="w-8 h-8 flex items-center justify-center rounded border border-[#8a8a8a] text-sm hover:bg-[#f4f4f4]"
                  title="Quay lại hàng đợi"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-[#5f5f5f]">Yêu cầu trả hàng · </span>
                  <span className="text-sm font-bold text-[#191C19]">
                    {selectedItem.code} · kiểm tra hàng về kho
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 border border-[#2b2b2b] rounded bg-white">
                HÀNG VỀ 16/10 10:05
              </span>
            </div>

            {/* Bố cục 2 cột TH-03 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cột trái (6 cols): Đối chiếu hàng về */}
              <div className="lg:col-span-6 space-y-4 border-r border-[#E2E8E0] pr-0 lg:pr-5">
                <div>
                  <h2 className="text-base font-bold text-[#191C19]">
                    Đối chiếu hàng về với ảnh nhập kho
                  </h2>
                  <p className="text-xs text-[#5f5f5f]">
                    Mốc chuẩn là ảnh kho tự chụp ngày {selectedItem.stockInDate}, không phải ảnh người mua gửi.
                  </p>
                </div>

                {/* Bước 1: Nhập SKU */}
                <div className="border-2 border-[#2b2b2b] rounded-lg p-3.5 bg-white flex justify-between items-center gap-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider mb-1">
                      Bước 1 · Nhập mã SKU trên tem
                    </div>
                    <div className="text-xs text-[#4a4a4a]">
                      Xác nhận đúng món đã gửi đi. Khác món là ca gian lận, xử lý theo nhánh riêng.
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <input
                      type="text"
                      value={scannedSku}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScannedSku(val);
                        setSkuMatched(val.trim().toUpperCase() === selectedItem.sku.toUpperCase());
                      }}
                      className="border border-[#8a8a8a] rounded px-3 py-1.5 font-mono font-bold text-sm text-center uppercase w-32"
                    />
                    <div className={`text-[10px] font-bold mt-1 ${skuMatched ? 'text-[#006B2C]' : 'text-[#BA1A1A]'}`}>
                      {skuMatched ? '✓ Khớp · đúng món' : '✗ Không khớp SKU'}
                    </div>
                  </div>
                </div>

                {/* So sánh ảnh */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#6b6b6b] mb-1.5">
                      Ảnh nhập kho · {selectedItem.stockInDate}
                    </div>
                    <div className="flex gap-2">
                      {selectedItem.stockInPhotos.map((src, i) => (
                        <img key={i} src={src} alt="Kho" className="w-20 h-24 object-cover rounded border border-[#c4c4c4]" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#6b6b6b] mb-1.5">
                      Ảnh người mua gửi
                    </div>
                    <div className="flex gap-2">
                      {selectedItem.buyerPhotos.map((src, i) => (
                        <img key={i} src={src} alt="Khách" className="w-20 h-24 object-cover rounded border border-[#c4c4c4]" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bước 2: Checklist */}
                <div className="border border-[#8a8a8a] rounded-lg overflow-hidden bg-white text-xs">
                  <div className="p-2.5 bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] uppercase font-bold text-[#5f5f5f]">
                    Bước 2 · Đối chiếu từng mục
                  </div>
                  <div className="divide-y divide-[#e0e0e0]">
                    <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                      <input
                        type="checkbox"
                        checked={checklist.skuCorrect}
                        onChange={(e) => setChecklist({ ...checklist, skuCorrect: e.target.checked })}
                        className="mt-0.5 rounded border-[#8a8a8a]"
                      />
                      <div>
                        <span className="font-semibold">Đúng món theo mã SKU</span>
                        <span className="block text-[10px] text-[#7a7a7a]">{selectedItem.sku} khớp với món đã gửi đi</span>
                      </div>
                    </label>
                    <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                      <input
                        type="checkbox"
                        checked={checklist.labelIntact}
                        onChange={(e) => setChecklist({ ...checklist, labelIntact: e.target.checked })}
                        className="mt-0.5 rounded border-[#8a8a8a]"
                      />
                      <div>
                        <span className="font-semibold">Còn nguyên tem SKU trên sản phẩm</span>
                      </div>
                    </label>
                    <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                      <input
                        type="checkbox"
                        checked={checklist.noNewDamage}
                        onChange={(e) => setChecklist({ ...checklist, noNewDamage: e.target.checked })}
                        className="mt-0.5 rounded border-[#8a8a8a]"
                      />
                      <div>
                        <span className="font-semibold">Không có hư hỏng mới so với ảnh nhập kho</span>
                      </div>
                    </label>
                    <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                      <input
                        type="checkbox"
                        checked={checklist.noUsageSign}
                        onChange={(e) => setChecklist({ ...checklist, noUsageSign: e.target.checked })}
                        className="mt-0.5 rounded border-[#8a8a8a]"
                      />
                      <div>
                        <span className="font-semibold">Không có dấu vết đã qua sử dụng thêm</span>
                      </div>
                    </label>
                    <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                      <input
                        type="checkbox"
                        checked={checklist.accessoriesComplete}
                        onChange={(e) => setChecklist({ ...checklist, accessoriesComplete: e.target.checked })}
                        className="mt-0.5 rounded border-[#8a8a8a]"
                      />
                      <div>
                        <span className="font-semibold">Đủ phụ kiện đi kèm nếu có</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Cột phải (6 cols): Kết luận & Hoàn tiền */}
              <div className="lg:col-span-6 space-y-4">
                {/* Cảnh báo kiểm định viên */}
                {selectedItem.isInspectorSelf && (
                  <div className="border-2 border-[#2b2b2b] bg-[#f4f4f4] p-3 rounded-lg flex justify-between items-center gap-3">
                    <div className="text-xs">
                      <div className="font-bold text-[#191C19] mb-1">
                        Món này do CHÍNH BẠN kiểm định lúc nhập kho {selectedItem.stockInDate}
                      </div>
                      <div className="text-[10px] text-[#4a4a4a] leading-relaxed">
                        Người mua đang nói tình trạng tệ hơn kết luận bạn viết. Bạn vẫn kết luận được, nhưng nên để người khác xem cho khách quan.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Đã chuyển ca kiểm tra cho Moderator khác trong ca trực.')}
                      className="shrink-0 text-xs font-semibold px-2.5 py-1.5 border border-[#2b2b2b] rounded bg-white hover:bg-[#e0e0e0]"
                    >
                      Chuyển cho<br />người khác
                    </button>
                  </div>
                )}

                {/* Bước 3: Kết luận */}
                <div className="border border-[#8a8a8a] rounded-lg p-4 bg-white space-y-3 text-xs">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider">
                    Bước 3 · Kết luận
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="verdict"
                        value="VALID"
                        checked={inspectionVerdict === 'VALID'}
                        onChange={() => setInspectionVerdict('VALID')}
                      />
                      <span>Hợp lệ — hoàn tiền cho người mua</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="verdict"
                        value="INVALID"
                        checked={inspectionVerdict === 'INVALID'}
                        onChange={() => setInspectionVerdict('INVALID')}
                      />
                      <span>Không hợp lệ — không hoàn tiền</span>
                    </label>
                  </div>
                  {inspectionVerdict === 'INVALID' && (
                    <div className="pt-2 space-y-2">
                      <label className="block text-[11px] font-semibold text-[#BA1A1A]">
                        Lý do không hợp lệ & ghi chú chụp ảnh kho (Bắt buộc):
                      </label>
                      <textarea
                        rows="3"
                        value={invalidReason}
                        onChange={(e) => setInvalidReason(e.target.value)}
                        placeholder="Ví dụ: Rách tem mác, xuất hiện vết cào xước mới không có trong ảnh lưu trữ..."
                        className="w-full text-xs p-2 border border-[#8a8a8a] rounded"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-[#7a7a7a]">
                    Chọn Không hợp lệ thì bắt buộc nhập lý do và ít nhất một ảnh kho chụp để đối chất.
                  </p>
                </div>

                {/* Box tính tiền hoàn */}
                <div className="border border-[#8a8a8a] rounded-lg p-4 bg-white space-y-2 text-xs">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider mb-1">
                    Nếu kết luận hợp lệ, hoàn cho người mua
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Tiền hàng</span>
                    <span>{formatCurrencyVND(selectedItem.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Phí vận chuyển đơn gốc</span>
                    <span>{formatCurrencyVND(selectedItem.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Phí trả hàng</span>
                    <span className="text-[#006B2C] font-medium">kho chịu</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#d4d4d4] text-[#191C19]">
                    <span>Hoàn vào ví người mua</span>
                    <span>{formatCurrencyVND(selectedItem.amount + selectedItem.shippingFee)}</span>
                  </div>
                  <p className="text-[10px] text-[#7a7a7a] pt-1">
                    Vào ví ReHome, không hoàn về thẻ/MoMo. Tiền của người ký gửi đang giữ nên không phải đòi lại.
                  </p>
                </div>

                {/* Nút lưu kết luận */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!inspectionVerdict}
                    onClick={handleSaveInspection}
                    className={`py-2.5 px-6 rounded text-xs font-bold transition-all ${
                      inspectionVerdict
                        ? 'bg-[#2b2b2b] text-white hover:bg-black cursor-pointer'
                        : 'bg-[#efefef] text-[#9a9a9a] border border-[#c4c4c4] cursor-not-allowed'
                    }`}
                  >
                    Lưu kết luận
                  </button>
                  {!inspectionVerdict && (
                    <span className="text-xs text-[#5f5f5f]">Chọn kết luận mới lưu được</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Từ chối yêu cầu trả (TH-02) */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Từ chối yêu cầu trả hàng"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[#4a4a4a]">
              Người mua sẽ nhận được thông báo giải thích lý do yêu cầu không hợp lệ theo chính sách của ReHome.
            </p>
            <div>
              <label className="block font-bold text-[#191C19] mb-1">Lý do từ chối *</label>
              <textarea
                rows="3"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Lỗi người mua tự gây ra, vượt quá thời hạn 3 ngày kể từ khi nhận hàng..."
                className="w-full p-2.5 border border-[#8a8a8a] rounded"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                Hủy
              </Button>
              <Button size="sm" variant="danger" onClick={handleConfirmRejectRequest}>
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: Xử lý món hàng TH-04 sau khi hoàn tiền */}
        <Modal
          isOpen={isOutcomeModalOpen}
          onClose={() => setIsOutcomeModalOpen(false)}
          title="Chọn phương án xử lý món hàng (TH-04)"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[#4a4a4a]">
              Đã xác nhận trả hàng hợp lệ. Vui lòng chọn hướng xử lý tiếp theo cho món đồ này tại kho:
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => handleConfirmOutcome('RELIST')}
                className="p-3 border-2 border-[#2b2b2b] rounded-lg text-left hover:bg-[#F8FAF8] transition-colors"
              >
                <div className="font-bold text-[#191C19] text-sm">Đăng bán lại (Relist)</div>
                <div className="text-[11px] text-[#5f5f5f] mt-1">
                  Món hàng vẫn đạt tiêu chuẩn chất lượng. Hệ thống sẽ giữ nguyên SKU và mở bán lại trên ứng dụng.
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmOutcome('RETURN_SELLER')}
                className="p-3 border border-[#8a8a8a] rounded-lg text-left hover:bg-[#F8FAF8] transition-colors"
              >
                <div className="font-bold text-[#191C19] text-sm">Hoàn trả cho người ký gửi</div>
                <div className="text-[11px] text-[#5f5f5f] mt-1">
                  Món hàng bị lỗi hoặc không còn phù hợp để bán lại. Chuyển vào hàng đợi hoàn trả người ký gửi.
                </div>
              </button>
            </div>
          </div>
        </Modal>

        {/* MODAL: So sánh ảnh cạnh nhau */}
        <Modal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          title="So sánh ảnh nhập kho vs ảnh người mua gửi"
        >
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-[#191C19] mb-2">Ảnh lưu trữ khi nhập kho</div>
                  <img
                    src={selectedItem.stockInPhotos[0]}
                    alt="Kho"
                    className="w-full h-64 object-contain rounded border border-[#c4c4c4] bg-[#f9f9f9]"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#191C19] mb-2">Ảnh người mua chụp gửi</div>
                  <img
                    src={selectedItem.buyerPhotos[0]}
                    alt="Khách"
                    className="w-full h-64 object-contain rounded border border-[#c4c4c4] bg-[#f9f9f9]"
                  />
                </div>
              </div>
              <div className="text-right">
                <Button size="sm" variant="outline" onClick={() => setIsCompareModalOpen(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ModeratorLayout>
  );
}
