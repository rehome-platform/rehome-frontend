import React from 'react';
import { Modal, Button } from '../../../components/common/index.js';

export default function TrackingModal({ isOpen, onClose, order }) {
  const steps = [
    { title: 'Tạo đơn thành công', time: '10:00 - 05/10/2026', done: true },
    { title: 'Shop đã đóng gói & chụp ảnh minh chứng', time: '14:30 - 05/10/2026', done: true },
    { title: 'Bưu tá đã lấy hàng (Delivery Service)', time: '08:15 - 06/10/2026', done: true },
    { title: 'Đang vận chuyển giao người mua', time: 'Dự kiến 08/10/2026', done: false },
    { title: 'Giao hàng thành công (Đếm ngược 3 ngày đối soát)', time: 'Dự kiến', done: false },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Theo Dõi Vận Đơn: #${order?.trackingCode || 'VNPOST-82910'}`}>
      <div className="space-y-4">
        <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1">
          <p>Mã đơn hàng: <strong>#{order?.code || order?.id || 'ORD-8821'}</strong></p>
          <p>Đơn vị vận chuyển: <strong>Giao Hàng Nhanh / GHN Express</strong></p>
        </div>

        <div className="relative pl-6 space-y-4 border-l-2 border-primary/30 my-4">
          {steps.map((st, i) => (
            <div key={i} className="relative">
              <div
                className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 ${
                  st.done ? 'bg-primary border-primary' : 'bg-surface border-outline'
                }`}
              ></div>
              <div>
                <p className={`text-sm font-medium ${st.done ? 'text-on-surface' : 'text-outline'}`}>{st.title}</p>
                <p className="text-[11px] text-outline">{st.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </Modal>
  );
}
