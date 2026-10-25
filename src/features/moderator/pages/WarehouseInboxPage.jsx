import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Input, Badge } from '../../../components/common/index.js';

import { warehouseInboxService } from '../services/moderatorMockData.js';

/**
 * Trang Hộp Thư Hỗ Trợ Kho ReHome (F-091, UC-48, Mục 14)
 * Moderator trao đổi, giải đáp thắc mắc của Member về tình trạng ký gửi, đơn hàng và rút hàng
 */
export default function WarehouseInboxPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseInboxService.getConversations();
      setConversations(res.data);
      if (res.data.length > 0) {
        setActiveConv(res.data[0]);
      }
    } catch (err) {
      setError('Không thể tải danh sách hộp thư kho.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchConversations();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeConv) return;
    const textToSend = inputMsg.trim();
    setInputMsg('');

    try {
      const updated = await warehouseInboxService.sendMessage(activeConv.id, textToSend);
      setActiveConv(updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err) {
      alert('Có lỗi xảy ra khi gửi tin nhắn.');
    }
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
              Hỗ trợ kho
            </span>
            <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
              Hộp Thư Hỗ Trợ Kho & Trao Đổi Ký Gửi
            </h1>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Kênh liên lạc chính thức giữa nhân viên kho và Member. Hỗ trợ giải đáp tình trạng kiểm định, bàn giao và nhận lại đồ.
          </p>
        </div>

        {/* Trạng thái tải / Lỗi */}
        {loading && (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#DDE5D9] text-[#717971] text-sm">
            <span className="material-symbols-outlined animate-spin text-2xl mb-2 block">progress_activity</span>
            Đang tải dữ liệu tin nhắn...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-[#FFDAD6]/40 border border-[#BA1A1A]/30 text-[#BA1A1A] text-xs flex justify-between items-center">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchConversations}>Thử lại</Button>
          </div>
        )}

        {/* Chat box container */}
        {!loading && (
          <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[560px] overflow-hidden">
            {/* Cột danh sách hội thoại */}
            <div className="md:col-span-4 border-r border-[#DDE5D9] divide-y divide-[#F0F4EE] overflow-y-auto">
              <div className="p-3.5 bg-[#F8FAF8] border-b border-[#DDE5D9]">
                <span className="text-xs font-bold text-[#191C19]">Hội thoại đang chờ hỗ trợ ({conversations.length})</span>
              </div>
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-[#717971] text-xs">
                  Không có tin nhắn nào.
                </div>
              ) : (
                conversations.map((c) => {
                  const isSelected = activeConv?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveConv(c);
                        c.unread = false;
                      }}
                      className={`p-4 cursor-pointer transition-colors flex items-start space-x-3 ${
                        isSelected ? 'bg-[#F0F5EE]' : 'hover:bg-[#F8FAF8]'
                      }`}
                    >
                      <img src={c.avatar} alt={c.memberName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-[#191C19] truncate">{c.memberName}</span>
                          <span className="text-[10px] text-[#717971]">{c.lastTime}</span>
                        </div>
                        <p className="text-[11px] text-[#006B2C] font-semibold">{c.memberCode}</p>
                        <p className="text-[#414942] truncate text-[11px] mt-0.5">{c.lastMessage}</p>
                      </div>
                      {c.unread && (
                        <span className="w-2 h-2 rounded-full bg-[#006B2C] mt-1 shrink-0"></span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Cột khung chat */}
            <div className="md:col-span-8 flex flex-col justify-between bg-[#FCFDFB]">
              {!activeConv ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#717971]">
                  <span className="material-symbols-outlined text-4xl mb-2 text-[#DDE5D9]">chat</span>
                  <p className="text-xs">Chọn một cuộc hội thoại bên trái để bắt đầu hỗ trợ.</p>
                </div>
              ) : (
                <>
                  {/* Header chat */}
                  <div className="p-4 border-b border-[#DDE5D9] bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={activeConv.avatar} alt={activeConv.memberName} className="w-9 h-9 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-xs text-[#191C19]">{activeConv.memberName} ({activeConv.memberCode})</h4>
                        <p className="text-[10px] text-[#717971]">{activeConv.subject}</p>
                      </div>
                    </div>
                    <Badge variant="success">Kho Q7 - Trực tuyến</Badge>
                  </div>

            {/* Danh sách tin nhắn */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {activeConv.messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === 'moderator' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md p-3 rounded-2xl shadow-xs ${
                      m.sender === 'moderator'
                        ? 'bg-[#006B2C] text-white rounded-br-xs'
                        : 'bg-white border border-[#DDE5D9] text-[#191C19] rounded-bl-xs'
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                    <span
                      className={`text-[9px] block text-right mt-1 ${
                        m.sender === 'moderator' ? 'text-white/70' : 'text-[#717971]'
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

              {/* Input gửi tin */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-[#DDE5D9] flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập phản hồi cho Member..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-[#DDE5D9] bg-[#F8FAF8] text-xs text-[#191C19] focus:outline-none focus:border-[#006B2C] focus:bg-white"
                />
                <Button type="submit" className="bg-[#006B2C] text-white text-xs px-5">
                  <span className="material-symbols-outlined text-sm mr-1">send</span>
                  Gửi tin
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    )}
      </div>
    </ModeratorLayout>
  );
}
