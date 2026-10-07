import React, { useState, useEffect } from 'react';
import Button from './common/Button.jsx';
import Modal from './common/Modal.jsx';

/**
 * ConfirmModal: Confirmation or prompt modal for critical user actions
 */
export default function ConfirmModal({
  isOpen,
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  type = "confirm", // 'confirm' | 'prompt' | 'danger'
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  promptPlaceholder = "Nhập nội dung...",
  defaultValue = "",
  onConfirm,
  onClose,
}) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(type === 'prompt' ? inputValue : true);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>

        {type === 'prompt' && (
          <div>
            <textarea
              className="w-full p-2.5 text-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder={promptPlaceholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
