import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { warehouseInboxService } from '../services/warehouseInboxApi.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { useConversationTopic } from '../../../hooks/useWebSocket.js';

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
  const [activeTab, setActiveTab] = useState('ALL'); // Mặc định mở tab 'Tất cả' ('ALL' | 'DONE' | 'UNANSWERED')
  const [selectedConv, setSelectedConv] = useState(null);

  // Tin nhắn của hội thoại đang chọn
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);

  // Form gửi tin nhắn & ảnh
  const [inputText, setInputText] = useState('');
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Tải danh sách hội thoại
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseInboxService.getConversations();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setConversations(list);

      // Giữ hội thoại đang chọn hoặc nếu chưa chọn thì chọn hội thoại đầu tiên
      setSelectedConv((prev) => {
        if (!prev && list.length > 0) return list[0];
        if (prev) {
          const found = list.find((c) => String(c.id) === String(prev.id));
          return found || prev;
        }
        return null;
      });
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

  // Tải danh sách tin nhắn của hội thoại được chọn (API 112)
  const fetchMessages = useCallback(async (convId, initialMessages = []) => {
    if (!convId) return;
    try {
      setMessagesLoading(true);
      setMessagesError(null);

      let fetchedList = [];
      if (typeof warehouseInboxService.getMessages === 'function') {
        const res = await warehouseInboxService.getMessages(convId, { page: 0, size: 50 });
        fetchedList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } else {
        fetchedList = initialMessages;
      }

      // Gộp initialMessages (nếu có từ mock/chuyển tab) với tin nhắn tải từ API
      const combined = [...initialMessages, ...fetchedList];
      const dedupeMap = new Map();
      combined.forEach((m) => {
        const key = m?.id ? String(m.id) : `${m?.sender}-${m?.text || m?.content}-${m?.createdAt || m?.time}`;
        if (!dedupeMap.has(key)) dedupeMap.set(key, m);
      });
      const uniqueMessages = Array.from(dedupeMap.values());

      // Sắp xếp theo thứ tự thời gian tăng dần: tin cũ ở trên, tin mới ở dưới
      uniqueMessages.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.sentAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.sentAt || 0).getTime();
        return timeA - timeB;
      });

      setMessages(uniqueMessages);
    } catch (err) {
      console.error('Failed to fetch messages for conversation:', convId, err);
      setMessagesError('Không thể tải lịch sử tin nhắn. Vui lòng thử lại.');
      if (initialMessages && initialMessages.length > 0) {
        setMessages(initialMessages);
      }
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConv?.id) {
      fetchMessages(selectedConv.id, selectedConv.messages || []);
    } else {
      setMessages([]);
    }
  }, [selectedConv?.id, fetchMessages]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Lắng nghe tin nhắn mới qua WebSocket real-time (STOMP topic /topic/conversations.{id})
  const handleWebSocketMessage = useCallback(
    (payload) => {
      if (!payload || !payload.id) return;

      // Khử trùng: nếu tin nhắn đã có trong danh sách (được gửi trực tiếp từ client trước đó) thì bỏ qua
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(payload.id))) {
          return prev;
        }
        return [...prev, payload];
      });

      // Cập nhật tin nhắn cuối cùng trên danh sách hội thoại
      const previewText = payload.content || (payload.imageUrls?.length ? '[Hình ảnh]' : '—');
      setConversations((prev) =>
        (prev || []).map((c) => {
          if (String(c.id) === String(selectedConv?.id)) {
            return {
              ...c,
              lastMessage: {
                content: previewText,
                createdAt: payload.createdAt || new Date().toISOString(),
                senderId: payload.senderId,
              },
            };
          }
          return c;
        })
      );
    },
    [selectedConv?.id]
  );

  useConversationTopic(selectedConv?.id, handleWebSocketMessage);

  const filteredConversations = (conversations || []).filter((c) => {
    if (activeTab === 'UNANSWERED') return c?.status === 'UNANSWERED';
    if (activeTab === 'DONE') return c?.status === 'DONE';
    return true;
  });

  const unansweredCount = (conversations || []).filter((c) => c?.status === 'UNANSWERED').length;

  // Chọn ảnh để đính kèm
  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Reset file input value
    e.target.value = '';

    setUploadingImage(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const res = await warehouseInboxService.uploadImage(file);
        const url = res?.url || res?.fileUrl || (typeof res === 'string' ? res : '');
        if (url) {
          uploadedUrls.push(url);
        }
      }
      if (uploadedUrls.length > 0) {
        setPendingImages((prev) => [...prev, ...uploadedUrls]);
        toast.success(`Đã đính kèm ${uploadedUrls.length} ảnh.`);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      toast.error('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removePendingImage = (indexToRemove) => {
    setPendingImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Gửi tin nhắn trả lời (API 113)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if ((!text && pendingImages.length === 0) || !selectedConv || sending || uploadingImage) return;

    setSending(true);
    const imagesToSend = [...pendingImages];
    setInputText('');
    setPendingImages([]);

    try {
      const payload = {
        content: text,
        imageUrls: imagesToSend,
      };

      const res = await warehouseInboxService.sendMessage(
        selectedConv.id,
        payload,
        user?.name || user?.fullName || 'Nguyễn Văn A'
      );

      if (res) {
        // Chuẩn hóa định dạng tin nhắn vừa gửi
        const msgItem =
          res.content !== undefined || res.text !== undefined
            ? { ...res, isMine: true }
            : {
                id: res.id || Date.now().toString(),
                sender: 'moderator',
                senderName: user?.name || 'Nhân viên ReHome',
                content: text,
                text,
                imageUrls: imagesToSend,
                isMine: true,
                createdAt: new Date().toISOString(),
                time: 'Vừa xong',
              };

        // Cập nhật ngay tin nhắn lên khung chat (và khử trùng nếu id trùng)
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(msgItem.id))) {
            return prev;
          }
          return [...prev, msgItem];
        });

        // Cập nhật xem trước tin nhắn trong danh sách hội thoại
        const previewText = text || (imagesToSend.length ? '[Hình ảnh]' : '—');
        setConversations((prev) =>
          (prev || []).map((c) => {
            if (String(c.id) === String(selectedConv.id)) {
              return {
                ...c,
                lastMessage: {
                  content: previewText,
                  createdAt: msgItem.createdAt || new Date().toISOString(),
                  senderId: user?.id,
                },
                messages: [...(c.messages || []), msgItem],
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Có lỗi xảy ra khi gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  // Chuẩn hóa hiển thị số lượng thống kê của Member (0 món, 0 đơn thay vì null / —)
  const formatCountDisplay = (val, unit) => {
    if (val === undefined || val === null || val === '') return `0 ${unit}`;
    if (typeof val === 'number') return `${val} ${unit}`;
    if (typeof val === 'string') {
      return isNaN(Number(val)) ? val : `${val} ${unit}`;
    }
    return `0 ${unit}`;
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        {/* Header MC-01 / MC-02 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral pb-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-text">
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
            {/* Tabs: Thứ tự Tất cả -> Đã xong -> Chưa trả lời */}
            <div className="flex border-b border-neutral text-xs font-semibold bg-background">
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
                {/* Ẩn nút "Đánh dấu đã xong" (POST /conversations/{id}/done) theo C.1 #4 do BE chưa có API */}
                {selectedConv?.status === 'DONE' && (
                  <span className="text-[11px] font-bold text-primary">✓ Đã xong</span>
                )}
              </div>

              {/* Lịch sử tin nhắn */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-background">
                {messagesLoading && (
                  <div className="text-center text-textSecondary text-xs py-8">
                    Đang tải tin nhắn...
                  </div>
                )}
                {messagesError && (
                  <div className="p-4 text-center text-xs text-error space-y-2">
                    <div>{messagesError}</div>
                    <button
                      type="button"
                      onClick={() => fetchMessages(selectedConv.id, selectedConv.messages || [])}
                      className="px-3 py-1 text-xs border border-error rounded-xl hover:bg-error-light cursor-pointer"
                    >
                      Tải lại tin nhắn
                    </button>
                  </div>
                )}
                {!messagesLoading && !messagesError && messages.length === 0 && (
                  <div className="text-center text-textSecondary text-xs py-12">
                    Chưa có tin nhắn nào trong hội thoại này.
                  </div>
                )}
                {!messagesLoading &&
                  messages.map((m, idx) => {
                    const isMod =
                      Boolean(m?.isMine) ||
                      m?.sender === 'moderator' ||
                      m?.senderRole === 'MODERATOR' ||
                      Boolean(m?.isStaff) ||
                      (user?.id && m?.senderId && String(m.senderId) === String(user.id)) ||
                      (selectedConv?.counterpart?.id && m?.senderId && String(m.senderId) !== String(selectedConv.counterpart.id));

                    const msgText = m?.content || m?.text || '';
                    const msgImages = Array.isArray(m?.imageUrls) ? m.imageUrls : [];
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
                          className={`max-w-[70%] p-3 rounded-xl text-xs leading-relaxed space-y-2 ${
                            isMod
                              ? 'bg-primary text-white border border-primary shadow-sm'
                              : 'bg-surface text-text border border-neutral shadow-sm'
                          }`}
                        >
                          {msgText && <div>{msgText}</div>}
                          {msgImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {msgImages.map((imgUrl, imgIdx) => (
                                <a
                                  key={imgIdx}
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block overflow-hidden rounded-lg border border-white/20 hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Ảnh đính kèm ${imgIdx + 1}`}
                                    className="w-28 h-28 object-cover rounded-lg bg-black/10"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-[9px] text-textSecondary mt-1 px-1">
                          {isMod ? `${senderTitle} · ${msgTime}` : msgTime}
                        </div>
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              {/* Strip preview ảnh đang chuẩn bị gửi */}
              {pendingImages.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 px-3 border-t border-neutral bg-background flex-wrap shrink-0">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-neutral bg-surface">
                      <img src={img} alt="Ảnh đính kèm" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePendingImage(i)}
                        className="absolute top-0 right-0 bg-black/70 text-white rounded-bl p-1 text-[10px] hover:bg-black transition-colors"
                        title="Xóa ảnh"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {uploadingImage && (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-neutral flex items-center justify-center text-[10px] text-textSecondary animate-pulse">
                      Đang tải...
                    </div>
                  )}
                </div>
              )}

              {/* Khung nhập tin nhắn */}
              <form
                onSubmit={handleSendMessage}
                className="border-t border-neutral p-3 flex gap-2.5 items-center bg-surface shrink-0"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold px-3 py-2 border border-neutral rounded-xl bg-surface hover:bg-background text-text cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {uploadingImage ? 'Đang tải…' : 'Ảnh'}
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
                  disabled={(!inputText.trim() && pendingImages.length === 0) || sending || uploadingImage}
                  className="text-xs font-bold px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {sending ? 'Đang gửi…' : 'Gửi'}
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
                    <span className="font-bold text-text">
                      {selectedConv?.phone || selectedConv?.counterpart?.phone || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-textSecondary">Form ký gửi đang hoạt động</span>
                    <span className="font-bold text-primary">
                      {formatCountDisplay(
                        selectedConv?.consignCount ?? selectedConv?.counterpart?.consignCount,
                        'form'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-textSecondary">Đơn đang giao</span>
                    <span className="font-bold text-text">
                      {formatCountDisplay(
                        selectedConv?.shippingCount ?? selectedConv?.counterpart?.shippingCount,
                        'đơn'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-textSecondary">Yêu cầu trả hàng</span>
                    <span className="font-bold text-error">
                      {formatCountDisplay(
                        selectedConv?.returnCount ?? selectedConv?.counterpart?.returnCount,
                        'yêu cầu'
                      )}
                    </span>
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
