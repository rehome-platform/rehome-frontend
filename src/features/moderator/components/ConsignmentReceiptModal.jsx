import React from 'react';
import Modal from '../../../components/common/Modal.jsx';
import ReceiptPanel from '../phase2/ReceiptPanel.jsx';

export default function ConsignmentReceiptModal({ isOpen, onClose, receipt }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Biên nhận ký gửi" maxWidth="max-w-3xl">
      {isOpen && receipt?.receiptId ? (
        <ReceiptPanel receiptId={receipt.receiptId} />
      ) : (
        <p>Chưa có mã biên nhận từ máy chủ.</p>
      )}
    </Modal>
  );
}
