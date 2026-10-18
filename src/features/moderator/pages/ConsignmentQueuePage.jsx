import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';

/**
 * Trang Hàng Đợi Duyệt Form Ký Gửi Trực Tuyến (F-111..F-114, UC-61)
 * Moderator nhận việc từ hàng đợi chi nhánh kho, duyệt hoặc từ chối trước khi Member mang đồ đến
 */
export default function ConsignmentQueuePage() {
  const [queue, setQueue] = useState([
    {
      id: 'FORM-9821',
      memberCode: 'MB-008124',
      memberName: 'Lê Hoàng Nam',
      itemName: 'Áo măng tô dạ dáng dài Hàn Quốc',
      brand: 'Topten',
      category: 'Áo khoác',
      desiredPrice: 650000,
      photos: [
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=500',
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500',
      ],
      description: 'Áo mua mùa đông năm ngoái, mới mặc 2 lần, còn tag dự phòng, không ố vàng.',
      submittedAt: '15/10/2026 10:15',
      claimedBy: null, // null | 'MOD-07-003'
      status: 'PENDING', // 'PENDING' | 'CLAIMED' | 'APPROVED' | 'REJECTED'
    },
    {
      id: 'FORM-9822',
      memberCode: 'MB-009912',
      memberName: 'Nguyễn Thị Minh Thư',
      itemName: 'Quần jeans ống rộng cạp cao Zara',
      brand: 'Zara',
      category: 'Quần jean',
      desiredPrice: 380000,
      photos: [
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500',
      ],
      description: 'Quần jean form rộng, chất dày dặn không dão, khóa kéo trơn tru.',
      submittedAt: '15/10/2026 09:30',
      claimedBy: 'MOD-07-003',
      status: 'CLAIMED',
    },
    {
      id: 'FORM-9818',
      memberCode: 'MB-006541',
      memberName: 'Võ Minh Trí',
      itemName: 'Áo sơ mi lụa tơ tằm cổ bẻ',
      brand: 'Owen',
      category: 'Áo sơ mi',
      desiredPrice: 280000,
      photos: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
      ],
      description: 'Sơ mi công sở màu xanh nhạt, còn rất mới.',
      submittedAt: '14/10/2026 16:45',
      claimedBy: null,
      status: 'PENDING',
    },
  ]);

  const [selectedForm, setSelectedForm] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const handleClaim = (formId) => {
    setQueue(queue.map((f) =>
      f.id === formId ? { ...f, claimedBy: 'MOD-07-003 (Bạn)', status: 'CLAIMED' } : f
    ));
    alert('Đã nhận việc thành công! Hệ thống sẽ khóa form này trong 48h để bạn xử lý.');
  };

  const handleApprove = (formId) => {
    setQueue(queue.map((f) =>
      f.id === formId ? { ...f, status: 'APPROVED' } : f
    ));
    alert('Đã duyệt form ký gửi! Member có 7 ngày để mang đồ trực tiếp đến kho.');
    setSelectedForm(null);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    setQueue(queue.map((f) =>
      f.id === selectedForm.id ? { ...f, status: 'REJECTED', rejectReason } : f
    ));
    setIsRejectModalOpen(false);
    setSelectedForm(null);
    setRejectReason('');
    alert('Đã từ chối form ký gửi kèm lý do thông báo cho Member.');
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
              Hàng đợi kho
            </span>
            <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
              Hàng Đợi Duyệt Form Ký Gửi Trực Tuyến
            </h1>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Duyệt sơ bộ ảnh và thông tin đồ Member gửi lên. Form được duyệt sẽ cấp hạn 7 ngày cho Member mang đến quầy kho.
          </p>
        </div>

        {/* Danh sách form trong hàng đợi */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {queue.map((f) => (
              <div
                key={f.id}
                className={`p-5 rounded-2xl border bg-white shadow-sm flex flex-col sm:flex-row gap-4 justify-between transition-all ${
                  selectedForm?.id === f.id ? 'border-[#006B2C] ring-2 ring-[#006B2C]/10' : 'border-[#DDE5D9] hover:border-[#006B2C]/40'
                }`}
              >
                <div className="flex gap-4">
                  <img
                    src={f.photos[0]}
                    alt={f.itemName}
                    className="w-24 h-28 object-cover rounded-xl border border-[#DDE5D9] shrink-0"
                  />
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#191C19]">{f.itemName}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#F8FAF8] text-[#006B2C] border border-[#DDE5D9]">
                        {f.id}
                      </span>
                    </div>
                    <p className="text-[#414942]">
                      Thương hiệu: <strong>{f.brand}</strong> • Danh mục: {f.category}
                    </p>
                    <p className="text-[#414942]">
                      Người gửi: <strong>{f.memberName}</strong> ({f.memberCode})
                    </p>
                    <p className="text-[#717971] text-[11px] line-clamp-2">
                      "{f.description}"
                    </p>
                    <p className="text-xs font-bold text-[#006B2C] pt-1">
                      Giá mong muốn: {formatCurrencyVND(f.desiredPrice)}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col justify-between items-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="text-right">
                    {f.status === 'PENDING' && <Badge variant="warning">Chờ nhận việc</Badge>}
                    {f.status === 'CLAIMED' && <Badge variant="info">Đang xử lý ({f.claimedBy})</Badge>}
                    {f.status === 'APPROVED' && <Badge variant="success">Đã duyệt (Chờ khách đến)</Badge>}
                    {f.status === 'REJECTED' && <Badge variant="danger">Đã từ chối</Badge>}
                    <p className="text-[10px] text-[#717971] mt-1">{f.submittedAt}</p>
                  </div>

                  <div className="flex space-x-2">
                    {f.status === 'PENDING' && (
                      <Button size="sm" onClick={() => handleClaim(f.id)} className="bg-[#006B2C] text-white text-xs">
                        Nhận việc
                      </Button>
                    )}
                    {f.status === 'CLAIMED' && (
                      <Button size="sm" variant="outline" onClick={() => setSelectedForm(f)} className="text-xs">
                        Xem xét & Duyệt
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cột phải: Xem chi tiết & Xử lý */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#191C19]">Thao Tác Duyệt Form</h3>
              {selectedForm ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-[#F0F5EE] rounded-xl border border-[#C8E6C9]">
                    <p className="font-bold text-[#191C19]">{selectedForm.itemName}</p>
                    <p className="text-[#717971] text-[11px] mt-0.5">{selectedForm.brand} • {formatCurrencyVND(selectedForm.desiredPrice)}</p>
                  </div>

                  <div>
                    <span className="text-[#717971] block mb-1">Ảnh đính kèm từ Member:</span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedForm.photos.map((url, i) => (
                        <img key={i} src={url} alt="Chi tiết" className="w-full h-24 object-cover rounded-lg border border-[#DDE5D9]" />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      className="w-full bg-[#006B2C] hover:bg-[#005221] text-white text-xs"
                      onClick={() => handleApprove(selectedForm.id)}
                    >
                      <span className="material-symbols-outlined text-sm mr-1.5">check_circle</span>
                      Duyệt form (Mở hạn 7 ngày mang đồ)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-[#BA1A1A] text-[#BA1A1A] hover:bg-[#FFDAD6]/30 text-xs"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      <span className="material-symbols-outlined text-sm mr-1.5">cancel</span>
                      Từ chối kèm lý do
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#717971] py-8 text-center">
                  Chọn một form đã nhận việc để xem ảnh chi tiết và đưa ra quyết định.
                </p>
              )}
            </div>

            {/* Quy tắc 48h tự nhả việc */}
            <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-[#DDE5D9] text-xs text-[#414942] space-y-1.5">
              <p className="font-bold text-[#006B2C] flex items-center space-x-1">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>Quy tắc tự nhả việc 48h:</span>
              </p>
              <p>Hệ thống tự động nhả công việc về hàng đợi chung nếu sau 48 giờ Moderator nhận việc nhưng không đưa ra quyết định.</p>
            </div>
          </div>
        </div>

        {/* Modal từ chối form kèm lý do */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Từ Chối Form Ký Gửi"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#717971]">
              Vui lòng nêu rõ lý do để Member có thể chỉnh sửa lại form hoặc chọn sản phẩm phù hợp hơn:
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Ảnh chụp quá mờ không thấy rõ tem tag; Sản phẩm không thuộc danh mục nhận ký gửi của kho..."
              className="w-full p-3 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#191C19] focus:outline-none focus:border-[#006B2C]"
            />
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#DDE5D9]">
              <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Hủy</Button>
              <Button
                disabled={!rejectReason.trim()}
                onClick={handleReject}
                className="bg-[#BA1A1A] text-white"
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ModeratorLayout>
  );
}
