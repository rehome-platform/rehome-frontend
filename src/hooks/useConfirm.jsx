import React, { useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal.jsx';

/**
 * useConfirm hook to trigger interactive confirmation modals with Promises
 */
export function useConfirm() {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: 'Xác nhận',
    message: '',
    type: 'confirm',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy bỏ',
    promptPlaceholder: '',
    defaultValue: '',
    resolve: null,
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Xác nhận',
        message: options.message || 'Bạn có chắc chắn muốn thực hiện hành động này?',
        type: options.type || 'confirm',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy bỏ',
        promptPlaceholder: options.promptPlaceholder || 'Nhập nội dung...',
        defaultValue: options.defaultValue || '',
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback((value) => {
    if (modalState.resolve) {
      modalState.resolve(modalState.type === 'prompt' ? value : true);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, [modalState]);

  const handleClose = useCallback(() => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, [modalState]);

  const ConfirmDialog = useCallback(() => (
    <ConfirmModal
      isOpen={modalState.isOpen}
      title={modalState.title}
      message={modalState.message}
      type={modalState.type}
      confirmText={modalState.confirmText}
      cancelText={modalState.cancelText}
      promptPlaceholder={modalState.promptPlaceholder}
      defaultValue={modalState.defaultValue}
      onConfirm={handleConfirm}
      onClose={handleClose}
    />
  ), [modalState, handleConfirm, handleClose]);

  return { confirm, ConfirmDialog };
}

export default useConfirm;
