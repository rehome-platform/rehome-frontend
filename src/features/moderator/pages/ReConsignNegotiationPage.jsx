import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import ReceiptPanel from '../components/ReceiptPanel.jsx';
import MemberReConsignConfirmModal from '../components/MemberReConsignConfirmModal.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { endTermService } from '../services/endTermApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { Page, ResourceState, money } from '../components/WarehouseUi.jsx';

/**
 * KD-11 · Ký gửi lại — chốt giá mới / Đang thương lượng
 * Tuân thủ cấu trúc wireframe docs/Wireframe/L-02/screens/KD-11-DangThuongLuong.html & KD-11-DaChot.html
 */
export default function ReConsignNegotiationPage() {
  const { sku } = useParams();
  const navigate = useNavigate();

  const productResource = useResource((options) => inventoryService.read(sku, options), [sku]);
  const product = productResource.data;

  // Form states
  const [proposedPrice, setProposedPrice] = useState('680000');
  const [moderatorNote, setModeratorNote] = useState('');
  const [statusState, setStatusState] = useState('INIT'); // 'INIT' | 'PROPOSAL_SENT' | 'CONFIRMED'
  const [receiptId, setReceiptId] = useState(null);
  const [decisionId, setDecisionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Sync initial product data & lookup UUID decisionId
  useEffect(() => {
    let active = true;
    if (product) {
      if (product.reConsignStatus === 'PROPOSAL_SENT') {
        setStatusState('PROPOSAL_SENT');
        if (product.proposedPrice) setProposedPrice(String(product.proposedPrice));
        if (product.newReceiptId) setReceiptId(product.newReceiptId);
      } else if (product.reConsignStatus === 'CONFIRMED' || (product.status === 'ON_SALE' && product.newReceiptId)) {
        setStatusState('CONFIRMED');
        if (product.proposedPrice) setProposedPrice(String(product.proposedPrice));
        if (product.newReceiptId) setReceiptId(product.newReceiptId);
      }
    }

    const resolveDecisionId = async () => {
      if (product?.decisionId) {
        setDecisionId(product.decisionId);
        return;
      }
      try {
        const list = await endTermService.pendingPricing();
        if (!active) return;
        const found = (Array.isArray(list) ? list : []).find(
          (d) =>
            String(d.productId || '').toUpperCase() === String(sku || '').toUpperCase() ||
            String(d.id || '').toUpperCase() === String(sku || '').toUpperCase()
        );
        if (found?.id) {
          setDecisionId(found.id);
        }
      } catch (err) {
        console.warn('pendingPricing lookup error:', err);
      }
    };
    resolveDecisionId();
    return () => {
      active = false;
    };
  }, [product, sku]);

  // Calculations for reference
  const originalPrice = product?.agreedPrice || 850000;
  const floorPrice = Math.round(originalPrice * 0.5);
  const currentPrice = product?.currentPrice || 520000;
  const marketMin = product?.marketMinPrice || 520000;
  const marketMax = product?.marketMaxPrice || 700000;

  // Moderator sends price proposal to member
  const handleSendProposal = async (e) => {
    e?.preventDefault();
    const priceNum = parseInt(String(proposedPrice).replace(/\D/g, ''), 10);
    if (!priceNum || priceNum <= 0) {
      setFeedback('Vui lòng nhập giá đề xuất hợp lệ.');
      return;
    }

    try {
      setIsSubmitting(true);
      const targetId = decisionId || product?.decisionId || sku;
      const res = await endTermService.proposeReConsignPrice(targetId, {
        agreedPrice: priceNum,
        floorPrice: Math.round(priceNum * 0.5),
        conditionNote: product?.conditionNote,
        moderatorNote: moderatorNote.trim() || 'Món hàng còn tốt, đề xuất mức giá mới phù hợp với thị trường để dễ bán hơn.',
      });

      const newId = res?.receiptId || res?.newReceiptId || `KG-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      setReceiptId(newId);
      setStatusState('PROPOSAL_SENT');
      setFeedback('Đã gửi mức đề xuất giá mới thành công. Đang chờ Member xác nhận qua app.');
    } catch (err) {
      setFeedback(err.message || 'Lỗi khi gửi đề xuất giá mới.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Member confirms new receipt (from modal simulation or actual API)
  const handleMemberConfirm = async () => {
    try {
      setIsSubmitting(true);
      const activeReceiptId = receiptId || product?.newReceiptId || `KG-2026-000214`;
      await endTermService.confirmReConsignReceipt(activeReceiptId);

      setStatusState('CONFIRMED');
      setShowMemberModal(false);
      setFeedback('Member đã xác nhận giá mới thành công! Sản phẩm đã được chuyển sang Kỳ 1 và bắt đầu đăng bán lại.');
      productResource.refresh();
    } catch (err) {
      if (err.status === 403 || err.code === 'FORBIDDEN') {
        setStatusState('PROPOSAL_SENT');
        setShowMemberModal(false);
        setFeedback('Ghi chú vận hành: Thao tác xác nhận này thuộc quyền của Member trên App di động. Đề xuất giá mới đã được lưu và gửi tới Member thành công.');
      } else {
        setFeedback(err.message || 'Lỗi khi xác nhận biên nhận.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page
      title={
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/moderator/inventory/${sku}`)} className="text-xs py-1.5 px-3">
            ← Quay lại sản phẩm
          </Button>
          <span>Tồn kho · hết kỳ 3 · Ký gửi lại — chốt giá mới</span>
        </div>
      }
      subtitle={`Mã SKU: ${sku} · Sản phẩm đang lưu giữ tại kho`}
      actions={
        <div className="flex items-center gap-2">
          {statusState === 'INIT' && (
            <span className="text-[11px] font-bold tracking-wider px-3 py-1.5 bg-[#f4f4f4] border border-[#8a8a8a] text-[#4a4a4a] rounded">
              ĐANG THƯƠNG LƯỢNG GIÁ MỚI
            </span>
          )}
          {statusState === 'PROPOSAL_SENT' && (
            <span className="text-[11px] font-bold tracking-wider px-3 py-1.5 bg-[#f4f4f4] border border-[#8a8a8a] text-[#4a4a4a] rounded animate-pulse">
              ĐÃ GỬI ĐỀ XUẤT · CHỜ MEMBER XÁC NHẬN QUA APP
            </span>
          )}
          {statusState === 'CONFIRMED' && (
            <span className="text-[11px] font-bold tracking-wider px-3 py-1.5 bg-[#2b2b2b] text-white rounded">
              MEMBER ĐÃ XÁC NHẬN · ĐÃ CHỐT
            </span>
          )}
        </div>
      }
    >
      <ResourceState resource={productResource} />

      {feedback && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex justify-between items-center">
          <span>✓ {feedback}</span>
          <button type="button" onClick={() => setFeedback('')} className="text-emerald-700 hover:text-emerald-900 ml-3">
            ✕
          </button>
        </div>
      )}

      {product && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* CỘT TRÁI: THÔNG TIN SẢN PHẨM & DỮ LIỆU THAM KHẢO ĐỊNH GIÁ (KD-11) */}
          <div className="space-y-5">
            {/* 1. Món đang ở kho */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#191C19] border-b border-[#e5e5e5] pb-2.5">
                Món đang ở kho
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-xl border border-[#c4c4c4] bg-[#f9f9f9] flex-shrink-0 flex items-center justify-center font-bold text-xs text-[#8a8a8a]">
                  Ảnh kho
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="text-base font-bold text-[#191C19]">{product.name}</h3>
                  <p className="text-xs text-[#5f5f5f]">
                    {product.brandName || product.brand || 'ReHome'} · Size {product.size || 'M'} ·{' '}
                    <span className="font-mono font-bold text-[#006B2C]">{product.sku}</span>
                  </p>
                  <p className="text-xs text-[#5f5f5f] pt-1">
                    Người ký gửi: <span className="font-bold text-[#191C19]">{product.member?.fullName || 'Trần Văn G'}</span> ·{' '}
                    <span className="font-mono text-[#7a7a7a]">{product.member?.memberCode || product.memberId || 'MB-0103882'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Tham khảo khi định giá lại */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#191C19] border-b border-[#e5e5e5] pb-2.5">
                Tham khảo khi định giá lại
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#f0f0f0]">
                  <span className="text-[#5f5f5f]">Giá bán cũ, hết kỳ không bán được</span>
                  <span className="font-bold text-[#191C19]">{money(originalPrice)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#f0f0f0]">
                  <span className="text-[#5f5f5f]">Giá sàn tự tính · 50% giá chốt ban đầu</span>
                  <span className="font-semibold text-[#191C19]">{money(floorPrice)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#5f5f5f]">Món cùng loại đang bán trên sàn</span>
                  <span className="font-bold text-[#006B2C]">
                    {money(marketMin)} – {money(marketMax)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Ghi chú quy tắc kho */}
            <div className="rounded-2xl border border-dashed border-[#9a9a9a] bg-[#fafafa] p-4 text-xs text-[#4a4a4a] leading-relaxed">
              Hàng <strong className="text-[#191C19]">vẫn được lưu kho</strong>, không xuất kho rồi nhập lại. Kỳ ký gửi và hoa hồng tính lại từ Kỳ 1 vì đây là lượt ký gửi mới, không phải tiếp tục lượt cũ.
            </div>
          </div>

          {/* CỘT PHẢI: KHUNG ĐỀ XUẤT GIÁ & THAO TÁC CHỐT (KD-11 / KD-11-DaChot) */}
          <div className="space-y-5">
            {statusState !== 'CONFIRMED' ? (
              /* TRẠNG THÁI: ĐANG THƯƠNG LƯỢNG HOẶC ĐÃ GỬI ĐỀ XUẤT */
              <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-6 shadow-sm space-y-5">
                <div>
                  <label htmlFor="reconsign-proposed-price" className="block text-xs font-bold uppercase tracking-wider text-[#191C19] mb-2">
                    Giá bán đề xuất ký gửi lại
                  </label>
                  <div className="relative">
                    <input
                      id="reconsign-proposed-price"
                      type="text"
                      disabled={statusState === 'PROPOSAL_SENT'}
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-2xl font-bold font-mono px-4 py-3 rounded-xl border-2 border-[#2b2b2b] focus:outline-none focus:border-[#006B2C] disabled:bg-[#f4f4f4] disabled:text-[#7a7a7a]"
                      placeholder="680000"
                    />
                    <span className="absolute right-4 top-3.5 text-base font-bold text-[#5f5f5f]">VND</span>
                  </div>
                  <p className="text-[11px] text-[#7a7a7a] mt-2">
                    Member có 48 giờ để xác nhận hoặc đề xuất mức khác qua app trước khi tự huỷ.
                  </p>
                </div>

                <div>
                  <label htmlFor="reconsign-moderator-note" className="block text-xs font-bold text-[#191C19] mb-1.5">
                    Ghi chú của Moderator gửi Member
                  </label>
                  <textarea
                    id="reconsign-moderator-note"
                    disabled={statusState === 'PROPOSAL_SENT'}
                    rows={3}
                    value={moderatorNote}
                    onChange={(e) => setModeratorNote(e.target.value)}
                    placeholder="Món hàng còn tốt, đề xuất mức giá mới dễ bán hơn..."
                    className="w-full text-xs p-3 rounded-xl border border-[#8a8a8a] focus:outline-none focus:border-[#006B2C] disabled:bg-[#f4f4f4]"
                  />
                </div>

                {/* Các nút hành động */}
                <div className="space-y-3 pt-3 border-t border-[#e5e5e5]">
                  {statusState === 'INIT' ? (
                    <Button
                      variant="primary"
                      onClick={handleSendProposal}
                      loading={isSubmitting}
                      className="w-full py-2.5 text-sm font-semibold rounded-xl"
                    >
                      Gửi đề xuất giá mới cho Member
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          disabled
                          className="flex-[1.6] py-2 text-xs font-semibold bg-[#efefef] text-[#9a9a9a] border border-[#c4c4c4] cursor-not-allowed"
                        >
                          Đang chờ Member phản hồi...
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setStatusState('INIT')}
                          className="flex-1 py-2 text-xs"
                        >
                          Sửa lại mức đề xuất, gửi lại
                        </Button>
                      </div>

                      {/* Nút mô phỏng Member duyệt */}
                      <div className="p-3 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#006B2C]">
                          Mô phỏng app Member:
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowMemberModal(true)}
                          className="text-xs py-1.5 px-3 font-semibold"
                        >
                          Mở duyệt giá →
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TRẠNG THÁI: ĐÃ CHỐT (KD-11-DaChot) */
              <div className="rounded-2xl border border-neutral bg-white p-6 shadow-sm space-y-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#191C19] mb-2">
                    Giá bán đã chốt
                  </div>
                  <div className="text-3xl font-bold font-mono text-[#006B2C] p-4 bg-[#f9f9f9] border border-neutral rounded-xl">
                    {money(Number(proposedPrice))}
                  </div>
                  <p className="text-xs text-[#4a4a4a] leading-relaxed mt-3">
                    Biên nhận ký gửi lại <strong className="font-mono text-[#191C19]">{receiptId || 'KG-2026-000214'}</strong> đã sinh. Hàng vẫn được lưu kho, không xuất kho. Bắt đầu Kỳ 1 (ngày 1/30), hoa hồng 10%.
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#e5e5e5]">
                  <Button
                    variant="primary"
                    onClick={() => setShowReceiptModal(true)}
                    className="w-full py-2.5 text-sm font-semibold rounded-xl"
                  >
                    Xem biên nhận ký gửi lại
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/moderator/inventory/${sku}`)}
                      className="flex-1 py-2 text-xs"
                    >
                      Chi tiết sản phẩm
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/moderator/inventory')}
                      className="flex-1 py-2 text-xs"
                    >
                      Về danh sách tồn kho
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MÔ PHỎNG MEMBER XÁC NHẬN GIÁ (KG-12) */}
      <MemberReConsignConfirmModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        product={product}
        proposedPrice={proposedPrice}
        moderatorNote={moderatorNote}
        onConfirm={handleMemberConfirm}
        onReject={() => {
          setShowMemberModal(false);
          setStatusState('INIT');
          setFeedback('Member đã từ chối mức giá đề xuất.');
        }}
        loading={isSubmitting}
      />

      {/* MODAL XEM BIÊN NHẬN KÝ GỬI LẠI */}
      {showReceiptModal && (
        <Modal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          title="Biên nhận ký gửi lại"
          size="lg"
        >
          <div className="space-y-4">
            <ReceiptPanel receiptId={receiptId || 'KG-2026-000214'} />
            <div className="flex justify-end pt-3 border-t border-neutral">
              <Button variant="primary" onClick={() => setShowReceiptModal(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}

