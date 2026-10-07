import React, { useState } from 'react';
import Button from './common/Button.jsx';

export default function Chat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Xin chào! ReHome có thể hỗ trợ gì cho bạn hôm nay?' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Cảm ơn bạn đã liên hệ. Đội ngũ hỗ trợ ReHome sẽ phản hồi trong ít phút!',
        },
      ]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:bg-primary-container transition-transform hover:scale-105"
          aria-label="Mở khung hỗ trợ"
        >
          <span className="material-symbols-outlined text-2xl">chat</span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 h-[480px] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-primary text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined">support_agent</span>
              <span className="font-semibold text-sm">Hỗ trợ trực tuyến ReHome</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-xl text-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-surface-container text-on-surface rounded-bl-none border border-outline-variant'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-outline-variant flex space-x-2 bg-surface-container-lowest">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" type="submit">
              Gửi
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
