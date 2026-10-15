import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Input, Badge } from '../../../components/common/index.js';

/**
 * Trang Hộp Thư Hỗ Trợ Kho ReHome (F-091, UC-48, Mục 14)
 * Moderator trao đổi, giải đáp thắc mắc của Member về tình trạng ký gửi, đơn hàng và rút hàng
 */
export default function WarehouseInboxPage() {
  const [conversations, setConversations] = useState([
    {
      id: 'CONV-01',
      memberCode: 'MB-0098231',
      memberName: 'Trần Thị B',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      subject: 'Hỏi về thời hạn rút hàng miễn phí kỳ 2',
      lastMessage: 'Dạ anh/chị cho em hỏi món áo blazer của em qua kỳ 2 có được 7 ngày rút miễn phí nữa không ạ?',
      lastTime: '13:40',
      unread: true,
      messages: [
        { sender: 'member', text: 'Chào kho ReHome Quận 7 ạ!', time: '13:35' },
        { sender: 'member', text: 'Dạ anh/chị cho em hỏi món áo blazer của em qua kỳ 2 có được 7 ngày rút miễn phí nữa không ạ?', time: '13:40' },
      ],
    },
    {
      id: 'CONV-02',
      memberCode: 'MB-008129',
      memberName: 'Lê Hoàng Nam',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      subject: 'Xác nhận đến lấy đồ ký gửi bị từ chối',
      lastMessage: 'Cảm ơn kho, chiều nay 16h em ghé lấy lại áo sơ mi ạ.',
      lastTime: '11:15',
      unread: false,
      messages: [
        { sender: 'moderator', text: 'Chào bạn Nam, form ký gửi áo sơ mi của bạn đã được kiểm định xong tại quầy.', time: '11:00' },
        { sender: 'member', text: 'Cảm ơn kho, chiều nay 16h em ghé lấy lại áo sơ mi ạ.', time: '11:15' },
      ],
    },
  ]);

  const [activeConv, setActiveConv] = useState(conversations[0]);
  const [inputMsg, setInputMsg] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg = {
      sender: 'moderator',
      text: inputMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = {
      ...activeConv,
      unread: false,
      messages: [...activeConv.messages, newMsg],
      lastMessage: inputMsg,
      lastTime: newMsg.time,
    };

    setActiveConv(updated);
    setConversations(conversations.map((c) => (c.id === activeConv.id ? updated : c)));
    setInputMsg('');
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
              Hỗ trợ kho • F-091, UC-48
            </span>
            <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
              Hộp Thư Hỗ Trợ Kho & Trao Đổi Ký Gửi
            </h1>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Kênh liên lạc chính thức giữa nhân viên kho và Member. Hỗ trợ giải đáp tình trạng kiểm định, bàn giao và nhận lại đồ.
          </p>
        </div>

        {/* Chat box container */}
        <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[560px] overflow-hidden">
          {/* Cột danh sách hội thoại */}
          <div className="md:col-span-4 border-r border-[#DDE5D9] divide-y divide-[#F0F4EE] overflow-y-auto">
            <div className="p-3.5 bg-[#F8FAF8] border-b border-[#DDE5D9]">
              <span className="text-xs font-bold text-[#191C19]">Hội thoại đang chờ hỗ trợ</span>
            </div>
            {conversations.map((c) => {
              const isSelected = activeConv.id === c.id;
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
            })}
          </div>

          {/* Cột khung chat */}
          <div className="md:col-span-8 flex flex-col justify-between bg-[#FCFDFB]">
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
          </div>
        </div>
      </div>
    </ModeratorLayout>
  );
}
