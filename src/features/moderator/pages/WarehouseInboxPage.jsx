import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { warehouseInboxService } from '../services/moderatorMockData.js';

/**
 * Trang Hộp Thư Kho ReHome
 * Chuẩn hóa 100% theo các wireframe:
 * - MC-01: Hộp thư kho — danh sách hội thoại chung, phân loại chưa trả lời / tất cả / đã xong
 * - MC-02: Phòng chat với Member — 3 cột (danh sách | hội thoại chat | thông tin member & SKU liên quan)
 */
export default function WarehouseInboxPage() {
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
      setConversations(res.data);
      // Giữ hội thoại đang chọn hoặc nếu chưa chọn
      if (!selectedConv && res.data.length > 0) {
        setSelectedConv(res.data[0]);
      }
    } catch (err) {
      setError('Không thể tải danh sách hộp thư kho.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const filteredConversations = conversations.filter((c) => {
    if (activeTab === 'UNANSWERED') return c.status === 'UNANSWERED';
    if (activeTab === 'DONE') return c.status === 'DONE';
    return true;
  });

  const unansweredCount = conversations.filter((c) => c.status === 'UNANSWERED').length;

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
      setSelectedConv(updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err) {
      alert('Có lỗi xảy ra khi gửi tin nhắn.');
    }
  };

  const handleMarkAsDone = async () => {
    if (!selectedConv) return;
    try {
      const updated = await warehouseInboxService.markAsDone(selectedConv.id);
      setSelectedConv(updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      alert(`Đã đánh dấu hoàn tất hội thoại với Member ${selectedConv.memberName}!`);
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật trạng thái.');
    }
  };

  return (
    <ModeratorLayout>
      <div className="space-y-4">
        {/* Header MC-01 / MC-02 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8E0] pb-3">
          <div>
            <h1 className="text-xl font-bold font-heading text-[#191C19]">
              Hộp thư kho
            </h1>
          </div>
          <div className="text-xs text-[#5f5f5f] font-medium">
            Hộp thư chung — mọi Moderator trong kho đều thấy
          </div>
        </div>

        {/* Khung giao diện 3 cột MC-01 / MC-02 */}
        <div className="bg-white border border-[#8a8a8a] rounded-lg shadow-sm flex flex-col lg:flex-row min-h-[640px] overflow-hidden">
          {/* CỘT 1 (360px): DANH SÁCH HỘI THOẠI */}
          <div className="w-full lg:w-[360px] border-r border-[#c4c4c4] flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-[#c4c4c4] text-xs font-semibold bg-[#fafafa]">
              <button
                type="button"
                onClick={() => setActiveTab('UNANSWERED')}
                className={`py-2.5 px-3.5 transition-all ${
                  activeTab === 'UNANSWERED'
                    ? 'border-b-2 border-[#2b2b2b] text-[#191C19] font-bold bg-white'
                    : 'text-[#7a7a7a] hover:text-[#191C19]'
                }`}
              >
                Chưa trả lời · {unansweredCount}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`py-2.5 px-3.5 transition-all ${
                  activeTab === 'ALL'
                    ? 'border-b-2 border-[#2b2b2b] text-[#191C19] font-bold bg-white'
                    : 'text-[#7a7a7a] hover:text-[#191C19]'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DONE')}
                className={`py-2.5 px-3.5 transition-all ${
                  activeTab === 'DONE'
                    ? 'border-b-2 border-[#2b2b2b] text-[#191C19] font-bold bg-white'
                    : 'text-[#7a7a7a] hover:text-[#191C19]'
                }`}
              >
                Đã xong
              </button>
            </div>

            {/* Subheader note */}
            <div className="p-2.5 px-3.5 text-[10px] text-[#7a7a7a] border-b border-[#e0e0e0] bg-[#f9f9f9]">
              Chờ lâu nhất xếp trên cùng
            </div>

            {/* List items */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#e0e0e0]">
              {loading && (
                <div className="p-8 text-center text-xs text-[#717971]">
                  Đang tải danh sách hộp thư...
                </div>
              )}
              {!loading && filteredConversations.length === 0 && (
                <div className="p-8 text-center text-xs text-[#717971]">
                  Không có hội thoại nào trong mục này.
                </div>
              )}
              {!loading &&
                filteredConversations.map((c) => {
                  const isSelected = selectedConv?.id === c.id;
                  const isUnanswered = c.status === 'UNANSWERED';
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConv(c)}
                      className={`p-3 px-3.5 flex items-center gap-2.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#ececec]' : 'hover:bg-[#fafafa]'
                      } ${
                        isUnanswered
                          ? 'border-l-4 border-l-[#2b2b2b]'
                          : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#d4d4d4] flex items-center justify-center font-bold text-xs text-[#4a4a4a] shrink-0 overflow-hidden">
                        {c.memberName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-xs font-bold text-[#191C19] truncate">
                            {c.memberName}
                          </span>
                          <span
                            className={`text-[10px] shrink-0 ml-1.5 ${
                              isUnanswered ? 'font-bold text-[#2b2b2b]' : 'text-[#7a7a7a]'
                            }`}
                          >
                            {c.waitTime}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5f5f5f] truncate">
                          {c.lastMessage}
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
              <div className="h-14 border-b border-[#c4c4c4] px-4 flex items-center justify-between shrink-0 bg-white">
                <div>
                  <span className="text-xs font-bold text-[#191C19]">{selectedConv.memberName}</span>
                  <span className="text-[10px] text-[#7a7a7a] ml-2 font-mono">
                    {selectedConv.memberCode}
                  </span>
                </div>
                {selectedConv.status === 'UNANSWERED' ? (
                  <button
                    type="button"
                    onClick={handleMarkAsDone}
                    className="text-[11px] font-semibold px-3 py-1.5 border border-[#8a8a8a] rounded bg-white hover:bg-[#f4f4f4] transition-colors"
                  >
                    Đánh dấu đã xong
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-[#006B2C]">✓ Đã xong</span>
                )}
              </div>

              {/* Lịch sử tin nhắn */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fafafa]">
                {selectedConv.messages.map((m) => {
                  const isMod = m.sender === 'moderator';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMod ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-xl text-xs leading-relaxed ${
                          isMod
                            ? 'bg-[#2b2b2b] text-white border border-[#2b2b2b]'
                            : 'bg-[#f4f4f4] text-[#191C19] border border-[#c4c4c4]'
                        }`}
                      >
                        {m.text}
                      </div>
                      <div className="text-[9px] text-[#7a7a7a] mt-1 px-1">
                        {isMod ? `${m.senderName} · ${m.time}` : m.time}
                      </div>
                    </div>
                  );
                })}
                <div className="text-center text-[10px] text-[#7a7a7a] pt-3">
                  Member chỉ thấy "Nhân viên ReHome"; tên từng Moderator chỉ hiện ở phía kho
                </div>
              </div>

              {/* Khung nhập tin nhắn */}
              <form
                onSubmit={handleSendMessage}
                className="border-t border-[#8a8a8a] p-3 flex gap-2.5 items-center bg-white shrink-0"
              >
                <button
                  type="button"
                  onClick={() => alert('Đã mở cửa sổ chọn ảnh đính kèm')}
                  className="text-xs font-semibold px-3 py-2 border border-[#8a8a8a] rounded bg-white hover:bg-[#f4f4f4]"
                >
                  Ảnh
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập câu trả lời…"
                  className="flex-1 text-xs p-2.5 border border-[#8a8a8a] rounded focus:outline-none focus:border-[#2b2b2b]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="text-xs font-bold px-5 py-2.5 bg-[#2b2b2b] text-white rounded hover:bg-black disabled:opacity-50 transition-colors"
                >
                  Gửi
                </button>
              </form>
            </div>
          ) : (
            /* Placeholder trống (MC-01) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#fafafa]">
              <div className="text-sm font-bold text-[#191C19] mb-1">
                Chọn một hội thoại để trả lời
              </div>
              <div className="text-xs text-[#7a7a7a] max-w-xs leading-relaxed">
                {unansweredCount} hội thoại đang chờ. Không ai được giao riêng — bạn mở hội thoại nào thì bạn đang xử lý hội thoại đó.
              </div>
            </div>
          )}

          {/* CỘT 3 (300px): THÔNG TIN MEMBER & SKU LIÊN QUAN (MC-02) */}
          {selectedConv && (
            <div className="w-full lg:w-[300px] border-t lg:border-t-0 lg:border-l border-[#c4c4c4] p-4 text-xs space-y-4 shrink-0 bg-white">
              <div>
                <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider mb-2">
                  Thông tin Member
                </div>
                <div className="space-y-1.5 divide-y divide-[#f0f0f0]">
                  <div className="flex justify-between py-1">
                    <span className="text-[#7a7a7a]">Họ tên</span>
                    <span className="font-bold">{selectedConv.memberName}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#7a7a7a]">Số điện thoại</span>
                    <span className="font-bold">{selectedConv.phone}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#7a7a7a]">Hàng ký gửi</span>
                    <span className="font-bold text-[#006B2C]">{selectedConv.consignCount}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#7a7a7a]">Đơn đang giao</span>
                    <span className="font-bold">{selectedConv.shippingCount}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#7a7a7a]">Yêu cầu trả hàng</span>
                    <span className="font-bold text-[#BA1A1A]">{selectedConv.returnCount}</span>
                  </div>
                </div>
              </div>

              {selectedConv.mentionedItem && (
                <div className="border-t border-[#e0e0e0] pt-3">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider mb-2">
                    Hàng đang nhắc tới
                  </div>
                  <div className="border border-[#c4c4c4] p-2.5 rounded flex items-center gap-2.5 bg-[#fafafa]">
                    <div className="w-8 h-10 rounded border border-[#c4c4c4] bg-[#e0e0e0] shrink-0 flex items-center justify-center font-mono text-[10px]">
                      RH
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#191C19]">
                        {selectedConv.mentionedItem.sku}
                      </div>
                      <div className="text-[10px] text-[#5f5f5f]">
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
                    className="w-full mt-2.5 text-xs font-semibold py-2 border border-[#8a8a8a] rounded bg-white hover:bg-[#f4f4f4] transition-colors"
                  >
                    Mở trong Tồn kho
                  </button>
                </div>
              )}

              <div className="text-[10px] text-[#7a7a7a] leading-relaxed pt-2 border-t border-[#e0e0e0]">
                Chỉ xem. Moderator không sửa giá, kỳ hay thông tin Member từ màn chat.
              </div>
            </div>
          )}
        </div>
      </div>
    </ModeratorLayout>
  );
}
