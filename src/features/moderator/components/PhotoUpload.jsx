import React, { useEffect, useRef, useState } from 'react';
import Button from '../../../components/common/Button.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { usePhase2 } from '../hooks/warehouseHooks.jsx';
import { normalizeError } from '../models/warehouseModel.js';

export default function PhotoUpload({ onChange, disabled = false }) {
  const { signal, scope } = usePhase2();
  const [files, setFiles] = useState([]);
  const controllers = useRef(new Set());
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controllers.current.forEach((controller) => controller.abort());
    };
  }, []);
  useEffect(() => {
    onChange(
      files.filter((file) => file.status === 'DONE').map((file) => file.url),
      files.some((file) => ['PENDING', 'UPLOADING', 'FAILED'].includes(file.status)),
    );
  }, [files, onChange]);
  const upload = async (item) => {
    const controller = new AbortController();
    controllers.current.add(controller);
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort);
    const update = (patch) => {
      if (active.current && !signal.aborted && !controller.signal.aborted)
        setFiles((previous) =>
          previous.map((file) => (file.key === item.key ? { ...file, ...patch } : file)),
        );
    };
    update({ status: 'UPLOADING', error: null, progress: 0 });
    try {
      if (signal.aborted) return;
      const result = await inventoryService.upload(item.file, {
        signal: controller.signal,
        scope,
        onUploadProgress: (event) =>
          update({ progress: event.total ? Math.round((event.loaded / event.total) * 100) : 0 }),
      });
      if (!result?.url) throw new Error('Upload không trả về URL ảnh.');
      update({ status: 'DONE', url: result.url, progress: 100 });
    } catch (error) {
      update({ status: 'FAILED', error: normalizeError(error).message });
    } finally {
      controllers.current.delete(controller);
      signal.removeEventListener('abort', abort);
    }
  };
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Ảnh sản phẩm
        <input
          aria-label="Ảnh sản phẩm"
          className="mt-2 block w-full text-sm"
          type="file"
          multiple
          accept="image/*"
          disabled={disabled}
          onChange={(event) => {
            const added = Array.from(event.target.files).map((file) => ({
              file,
              key: crypto.randomUUID(),
              status: 'PENDING',
            }));
            setFiles((previous) => [...previous, ...added]);
            added.forEach(upload);
            event.target.value = '';
          }}
        />
      </label>
      {files.map((item) => (
        <div key={item.key} className="rounded-xl border border-neutral p-3 text-sm space-y-2">
          <p>
            {item.file.name} ·{' '}
            {item.status === 'DONE'
              ? 'Đã tải ảnh gốc'
              : item.status === 'UPLOADING'
                ? `Đang tải ${item.progress}%`
                : 'Chưa tải thành công'}
          </p>
          {item.status === 'UPLOADING' && (
            <progress max="100" value={item.progress} aria-label={`Tiến độ ${item.file.name}`} />
          )}
          {item.error && (
            <p role="alert" className="text-error">
              {item.error}
            </p>
          )}
          {item.status === 'FAILED' && (
            <Button variant="outline" disabled={disabled} onClick={() => upload(item)}>
              Thử tải lại
            </Button>
          )}
          {item.status !== 'UPLOADING' && (
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() =>
                setFiles((previous) => previous.filter((file) => file.key !== item.key))
              }
            >
              Bỏ ảnh
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
