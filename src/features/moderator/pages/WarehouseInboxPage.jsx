import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { warehouseInboxService } from '../services/warehouseInboxApi.js';
import { useToast } from '../../../context/ToastContext.jsx';

/**
 * Trang Hộp Thư Điểm Kí Gửi ReHome
 * Chuẩn hóa 100% theo các wireframe:
 * - MC-01: Hộp thư điểm kí gửi — danh sách hội thoại chung, phân loại chưa trả lời / tất cả / đã xong
 * - MC-02: Phòng chat với Member — 3 cột (danh sách | hội thoại chat | thông tin member & SKU liên quan)
 */
export default function WarehouseInboxPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState('UNANSWERED'); // 'UNANSWERED' | 'ALL' | 'DONE'
  const [selectedConv, setSelectedConv] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseInboxService.getConversations();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setConversations(list);
      // Giữ hội thoại đang chọn hoặc nếu chưa chọn thì chọn hội thoại đầu tiên
      if (!selectedConv && list.length > 0) {
        setSelectedConv(list[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Không thể kết nối đến máy chủ hộp thư (Lỗi 500 hoặc mất kết nối). Vui lòng thử lại sau.');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const filteredConversations = (conversations || []).filter((c) => {
    if (activeTab === 'UNANSWERED') return c?.status === 'UNANSWERED';
    if (activeTab === 'DONE') return c?.status === 'DONE';
    return true;
  });

  const unansweredCount = (conversations || []).filter((c) => c?.status === 'UNANSWERED').length;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConv) return;
    const msg = inputText.trim();
    setInputText('');

    try {
      const updated = await warehouseInboxService.sendMessage(
        selectedConv.id,
        msg,
        user?.name || user?.fullName || 'Nguyễn Văn A'
      );
      if (updated) {
        setSelectedConv((prev) => ({
          ...prev,
          ...updated,
          messages: [
            ...(prev?.messages || []),
            ...(updated?.messages || [
              {
                id: Date.now().toString(),
                sender: 'moderator',
                senderName: user?.name || 'Nhân viên ReHome',
                text: msg,
                time: 'Vừa xong',
              },
            ]),
          ],
        }));
        setConversations((prev) =>
          (prev || []).map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
        );
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi gửi tin nhắn.');
    }
  };

  const handleMarkAsDone = async () => {
    if (!selectedConv) return;
    try {
      const updated = await warehouseInboxService.markAsDone(selectedConv.id);
      setSelectedConv(updated);
      setConversations((prev) =>
        (prev || []).map((c) => (c.id === updated.id ? updated : c))
      );
      toast.success(`Đã đánh dấu hoàn tất hội thoại với Member ${selectedConv?.memberName || 'Member'}!`);
    } catch (err) {
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái.');
    }
  };

  return (
    <ModeratorLayout>
      <div className="space-y-4">
        {/* Header MC-01 / MC-02 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral pb-3">
          <div>
            <h1 className="text-xl font-bold font-heading text-text">
              Hộp thư điểm kí gửi
            </h1>
          </div>
          <div className="text-xs text-textSecondary font-medium">
            Hộp thư chung — mọi Moderator trong điểm kí gửi đều thấy
          </div>
        </div>

        {/* Khung giao diện 3 cột MC-01 / MC-02 */}
        <div className="bg-surface border border-neutral rounded-2xl shadow-sm flex flex-col lg:flex-row min-h-[640px] overflow-hidden">
          {/* CỘT 1 (360px): DANH SÁCH HỘI THOẠI */}
          <div className="w-full lg:w-[360px] border-r border-neutral flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-neutral text-xs font-semibold bg-background">
              <button
                type="button"
                onClick={() => setActiveTab('UNANSWERED')}
                className={`py-2.5 px-3.5 transition-all ${
                  activeTab === 'UNANSWERED'
                    ? 'border-b-2 border-primary text-primary font-bold bg-surface'
                    : 'text-textSecondary hover:text-text'
                }`}
              >
                Chưa trả lời · {unansweredCount}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`py-2.5 px-3.5 transition-all ${
                  activeTab === 'ALL'
                    ? 'border-b-2 border-primary text-primary font-bold bg-surface'
                    : 'text-textSecondary hover:text-text'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DONE')}
                className={`py-2.5 px-3.5 transition-all ${
                  activeTab === 'DONE'
                    ? 'border-b-2 border-primary text-primary font-bold bg-surface'
                    : 'text-textSecondary hover:text-text'
                }`}
              >
                Đã xong
              </button>
            </div>

            {/* Subheader note */}
            <div className="p-2.5 px-3.5 text-[10px] text-textSecondary border-b border-neutral bg-background">
              Chờ lâu nhất xếp trên cùng
            </div>

            {/* List items */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral">
              {loading && (
                <div className="p-8 text-center text-xs text-textSecondary">
                  Đang tải danh sách hộp thư...
                </div>
              )}
              {!loading && error && (
                <div className="p-6 text-center text-xs text-error space-y-3">
                  <div className="font-semibold">{error}</div>
                  <button
                    type="button"
                    onClick={fetchConversations}
                    className="px-3.5 py-1.5 rounded-xl border border-error text-error hover:bg-error-light text-xs font-medium transition-colors cursor-pointer"
                  >
                    Tải lại
                  </button>
                </div>
              )}
              {!loading && !error && filteredConversations.length === 0 && (
                <div className="p-8 text-center text-xs text-textSecondary">
                  Không có hội thoại nào trong mục này.
                </div>
              )}
              {!loading &&
                !error &&
                (filteredConversations || []).map((c) => {
                  const isSelected = selectedConv?.id === c?.id;
                  const isUnanswered = c?.status === 'UNANSWERED';
                  const memberName = c?.memberName || c?.counterpart?.displayName || 'Member';
                  const lastMessageText =
                    typeof c?.lastMessage === 'string'
                      ? c.lastMessage
                      : c?.lastMessage?.content || '—';
                  const waitTimeText =
                    c?.waitTime ||
                    (c?.lastMessage?.createdAt
                      ? new Date(c.lastMessage.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '');

                  return (
                    <div
                      key={c?.id}
                      onClick={() => setSelectedConv(c)}
                      className={`p-3 px-3.5 flex items-center gap-2.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-neutral-light' : 'hover:bg-background'
                      } ${
                        isUnanswered
                          ? 'border-l-4 border-l-primary'
                          : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-neutral-light text-textSecondary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-neutral">
                        {memberName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-xs font-bold text-text truncate">
                            {memberName}
                          </span>
                          <span
                            className={`text-[10px] shrink-0 ml-1.5 ${
                              isUnanswered ? 'font-bold text-primary' : 'text-textSecondary'
                            }`}
                          >
                            {waitTimeText}
                          </span>
                        </div>
                        <div className="text-[11px] text-textSecondary truncate">
                          {lastMessageText}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* CỘT 2: KHU VỰC CHAT HOẶC PLACEHOLDER (MC-01 vs MC-02) */}
          {selectedConv ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header phòng chat MC-02 */}
              <div className="h-14 border-b border-neutral px-4 flex items-center justify-between shrink-0 bg-surface">
                <div>
                  <span className="text-xs font-bold text-text">
                    {selectedConv?.memberName || selectedConv?.counterpart?.displayName || 'Member'}
                  </span>
                  <span className="text-[10px] text-textSecondary ml-2 font-mono">
                    {selectedConv?.memberCode || selectedConv?.counterpart?.id || ''}
                  </span>
                </div>
                {selectedConv?.status === 'UNANSWERED' ? (
                  <button
                    type="button"
                    onClick={handleMarkAsDone}
                    className="text-[11px] font-semibold px-3 py-1.5 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors cursor-pointer"
                  >
                    Đánh dấu đã xong
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-primary">✓ Đã xong</span>
                )}
              </div>

              {/* Lịch sử tin nhắn */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-background">
                {((selectedConv?.messages) || []).length === 0 ? (
                  <div className="text-center text-textSecondary text-xs py-12">
                    Chưa có tin nhắn nào trong hội thoại này.
                  </div>
                ) : (
                  (selectedConv?.messages || []).map((m, idx) => {
                    const isMod =
                      m?.sender === 'moderator' ||
                      m?.senderRole === 'MODERATOR' ||
                      m?.isStaff;
                    const msgText = m?.text || m?.content || '';
                    const msgTime =
                      m?.time ||
                      (m?.createdAt
                        ? new Date(m.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '');
                    const senderTitle =
                      m?.senderName ||
                      (isMod
                        ? 'Nhân viên ReHome'
                        : selectedConv?.memberName ||
                          selectedConv?.counterpart?.displayName ||
                          'Member');

                    return (
                      <div
                        key={m?.id || idx}
                        className={`flex flex-col ${isMod ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-xl text-xs leading-relaxed ${
                            isMod
                              ? 'bg-primary text-white border border-primary shadow-sm'
                              : 'bg-surface text-text border border-neutral shadow-sm'
                          }`}
                        >
                          {msgText}
                        </div>
                        <div className="text-[9px] text-textSecondary mt-1 px-1">
                          {isMod ? `${senderTitle} · ${msgTime}` : msgTime}
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="text-center text-[10px] text-textSecondary pt-3">
                  Member chỉ thấy "Nhân viên ReHome"; tên từng Moderator chỉ hiện ở phía điểm kí gửi
                </div>
              </div>

              {/* Khung nhập tin nhắn */}
              <form
                onSubmit={handleSendMessage}
                className="border-t border-neutral p-3 flex gap-2.5 items-center bg-surface shrink-0"
              >
                <button
                  type="button"
                  onClick={() => toast.info('Đã mở cửa sổ chọn ảnh đính kèm')}
                  className="text-xs font-semibold px-3 py-2 border border-neutral rounded-xl bg-surface hover:bg-background text-text cursor-pointer"
                >
                  Ảnh
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập câu trả lời…"
                  className="flex-1 text-xs p-2.5 border border-neutral rounded-xl text-text focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="text-xs font-bold px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Gửi
                </button>
              </form>
            </div>
          ) : (
            /* Placeholder trống (MC-01) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
              <div className="text-sm font-bold font-heading text-text mb-1">
                Chọn một hội thoại để trả lời
              </div>
              <div className="text-xs text-textSecondary max-w-xs leading-relaxed">
                {unansweredCount} hội thoại đang chờ. Không ai được giao riêng — bạn mở hội thoại nào thì bạn đang xử lý hội thoại đó.
              </div>
            </div>
          )}

          {/* CỘT 3 (300px): THÔNG TIN MEMBER & SKU LIÊN QUAN (MC-02) */}
          {selectedConv && (
            <div className="w-full lg:w-[300px] border-t lg:border-t-0 lg:border-l border-neutral p-4 text-xs space-y-4 shrink-0 bg-surface">
              <div>
                <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider mb-2">
                  Thông tin Member
                </div>
                <div className="space-y-1.5 divide-y divide-neutral">
                  <div className="flex justify-between py-1">
                    <span className="text-textSecondary">Họ tên</span>
                    <span className="font-bold text-text">
                      {selectedConv?.memberName || selectedConv?.counterpart?.displayName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-textSecondary">Số điện thoại</span>
                    <span className="font-bold text-text">{selectedConv?.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-textSecondary">Hàng ký gửi</span>
                    <span className="font-bold text-primary">{selectedConv?.consignCount ?? '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-textSecondary">Đơn đang giao</span>
                    <span className="font-bold text-text">{selectedConv?.shippingCount ?? '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-textSecondary">Yêu cầu trả hàng</span>
                    <span className="font-bold text-error">{selectedConv?.returnCount ?? '—'}</span>
                  </div>
                </div>
              </div>

              {selectedConv?.mentionedItem && (
                <div className="border-t border-neutral pt-3">
                  <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider mb-2">
                    Hàng đang nhắc tới
                  </div>
                  <div className="border border-neutral p-2.5 rounded-xl flex items-center gap-2.5 bg-background">
                    <div className="w-8 h-10 rounded-lg border border-neutral bg-surface shrink-0 flex items-center justify-center font-mono text-[10px] text-textSecondary">
                      RH
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-text">
                        {selectedConv.mentionedItem.sku}
                      </div>
                      <div className="text-[10px] text-textSecondary">
                        {selectedConv.mentionedItem.status}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/moderator/inventory?sku=${encodeURIComponent(
                          selectedConv.mentionedItem.sku
                        )}`
                      )
                    }
                    className="w-full mt-2.5 text-xs font-semibold py-2 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors cursor-pointer"
                  >
                    Mở trong Tồn kho
                  </button>
                </div>
              )}

              <div className="text-[10px] text-textSecondary leading-relaxed pt-2 border-t border-neutral">
                Chỉ xem. Moderator không sửa giá, kỳ hay thông tin Member từ màn chat.
              </div>
            </div>
          )}
        </div>
      </div>
    </ModeratorLayout>
  );
}
