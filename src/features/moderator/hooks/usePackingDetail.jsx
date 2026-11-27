import React, { useRef, useState, useEffect } from "react";

import { usePhase2, useResource } from "./warehouseHooks.jsx";

import { packingService } from "../services/packingApi.js";
import { inventoryService } from "../services/inventoryApi.js";
import { canPack, canShip, canEditPackingPhotos, canHandoverToGhn, hasPackingPhotos } from "../models/packingModel.js";
import { operationReady } from "../config/packingContract.js";

export function usePackingDetail({ orderId, onChanged }) {
  const { scope, signal } = usePhase2();
  const alive = useRef(true);
  const resolvedOrderIdRef = useRef(orderId);
  const lastPropOrderIdRef = useRef(orderId);
  if (lastPropOrderIdRef.current !== orderId) {
    lastPropOrderIdRef.current = orderId;
    resolvedOrderIdRef.current = orderId;
  }

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const readEpoch = useRef(0);
  const resource = useResource(async options => {
    const epoch = readEpoch.current;
    const data = await packingService.read(resolvedOrderIdRef.current || orderId, options);
    const canonicalId = data?.id || data?.orderId;
    if (canonicalId) {
      resolvedOrderIdRef.current = canonicalId;
    }
    return { ...data, readEpoch: epoch };
  }, [orderId], {
    poll: true,
    done: (data) => Boolean(data?.ghnTrackingCode) || data?.shipmentOutcome === 'NOT_CREATED',
  });

  const [sku, setSku] = useState('');
  const [camera, setCamera] = useState(false);
  const [message, setMessage] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [pickedItems, setPickedItems] = useState({});
  const [scanLogs, setScanLogs] = useState([]);

  // Trạng thái modal cảnh báo sai món (DG-03-SaiMon) & in phiếu (DG-04)
  const [wrongItemModalOpen, setWrongItemModalOpen] = useState(false);
  const [wrongItem, setWrongItem] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [handoverLoading, setHandoverLoading] = useState(false);

  // Ảnh đóng gói (tối đa 5 ảnh, folder ORDER_PACKING)
  const [packingPhotos, setPackingPhotos] = useState([]);
  const [packingPhotosUploading, setPackingPhotosUploading] = useState(false);
  const [packingPhotosSaving, setPackingPhotosSaving] = useState(false);
  const [packingPhotosError, setPackingPhotosError] = useState('');
  const packingPhotosLock = useRef(false);

  const lock = useRef(false);
  const input = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const order = resource.data;
  const resolvedOrderId = order?.id || order?.orderId || resolvedOrderIdRef.current || orderId;
  const changed = () => { onChanged(); window.dispatchEvent(new Event('warehouse:changed')); };

  useEffect(() => {
    if (!packingPhotosLock.current && Array.isArray(order?.packingPhotoUrls)) {
      setPackingPhotos(order.packingPhotoUrls);
    }
  }, [order?.packingPhotoUrls]);

  const canEditPhotos =
    operationReady('packingPhotos') &&
    !uncertain &&
    canEditPackingPhotos(order, scope, now);

  const persistPackingPhotos = async (nextUrls) => {
    setPackingPhotosSaving(true);
    try {
      const saved = await packingService.updatePhotos(resolvedOrderId, nextUrls, { signal, scope });
      const resolvedUrls = Array.isArray(saved) ? saved : nextUrls;
      if (alive.current && !signal.aborted) {
        setPackingPhotos(resolvedUrls);
        resource.setData(prev => (prev ? { ...prev, packingPhotoUrls: resolvedUrls } : prev));
        setPackingPhotosError('');
      }
      return resolvedUrls;
    } finally {
      if (alive.current && !signal.aborted) {
        setPackingPhotosSaving(false);
      }
    }
  };

  const uploadPackingPhotos = async (files) => {
    if (packingPhotosLock.current || !files?.length || !canEditPhotos) return;
    if (packingPhotos.length + files.length > 5) {
      setPackingPhotosError('Chỉ được tải tối đa 5 ảnh đóng gói.');
      return;
    }
    packingPhotosLock.current = true;
    setPackingPhotosUploading(true);
    setPackingPhotosError('');
    const uploadedUrls = [];
    let errorMessage = '';
    try {
      for (const file of files) {
        if (!file.type?.startsWith('image/')) {
          errorMessage = 'Vui lòng chỉ chọn tệp hình ảnh.';
          continue;
        }
        try {
          const result = await inventoryService.upload(file, {
            signal,
            scope,
            folder: 'ORDER_PACKING',
          });
          if (!result?.url || !/^https:\/\//i.test(result.url)) {
            throw new Error('Máy chủ chưa trả về URL ảnh HTTPS hợp lệ.');
          }
          uploadedUrls.push(result.url);
        } catch (err) {
          errorMessage = err?.message || 'Không thể tải ảnh đóng gói lên.';
        }
      }
      if (uploadedUrls.length > 0 && alive.current && !signal.aborted) {
        const nextUrls = [...packingPhotos, ...uploadedUrls].slice(0, 5);
        await persistPackingPhotos(nextUrls);
      }
      if (errorMessage && alive.current && !signal.aborted) {
        setPackingPhotosError(errorMessage);
      }
    } catch (err) {
      if (alive.current && !signal.aborted) {
        setPackingPhotosError(err?.message || 'Không thể lưu danh sách ảnh đóng gói.');
      }
    } finally {
      packingPhotosLock.current = false;
      if (alive.current && !signal.aborted) {
        setPackingPhotosUploading(false);
      }
    }
  };

  const removePackingPhoto = async (index) => {
    if (packingPhotosLock.current || !canEditPhotos) return;
    const nextUrls = packingPhotos.filter((_, idx) => idx !== index);
    packingPhotosLock.current = true;
    setPackingPhotosError('');
    try {
      await persistPackingPhotos(nextUrls);
    } catch (err) {
      if (alive.current && !signal.aborted) {
        setPackingPhotosError(err?.message || 'Không thể xóa ảnh đóng gói.');
      }
    } finally {
      packingPhotosLock.current = false;
    }
  };

  const togglePicked = (productId) => {
    setPickedItems(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const scan = async (value) => {
    const code = value.trim();
    if (!code || actionBlocked('scan', { lock, uncertain, resource })) return;
    if (!canPack(order, scope, now)) return;
    lock.current = true;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    try {
      await resource.mutate(options => packingService.scan(resolvedOrderId, code, options), {
        skipRefresh: true,
        onSuccess: result => {
          if (result.matched) {
            setMessage('Đã đối chiếu Mã hàng hóa. Tiến độ đã được cập nhật.');
            setScanLogs(prev => [{ time: timeStr, code, status: 'Khớp — món thành công', matched: true }, ...prev]);
            setWrongItem(null);
            resource.setData(prev => {
              if (!prev) return prev;
              const matchedId = result.scannedProductId;
              const prevScannedIds = Array.isArray(prev.scannedProductIds) ? prev.scannedProductIds : [];
              const nextScannedIds =
                matchedId && !prevScannedIds.includes(matchedId)
                  ? [...prevScannedIds, matchedId]
                  : prevScannedIds;
              const nextItems = Array.isArray(prev.items)
                ? prev.items.map(item => {
                    const isMatch =
                      (matchedId && (item.productId === matchedId || item.id === matchedId)) ||
                      (item.productId && String(item.productId).toUpperCase() === code.toUpperCase()) ||
                      (item.sku && item.sku.toUpperCase() === code.toUpperCase());
                    return isMatch ? { ...item, scanned: true } : item;
                  })
                : prev.items;
              return {
                ...prev,
                scannedProductIds: nextScannedIds,
                scannedCount: result.scannedCount ?? nextScannedIds.length,
                totalCount: result.totalCount ?? prev.totalCount,
                items: nextItems,
              };
            });
            resource.silentRefresh?.();
          } else {
            setMessage('Mã hàng hóa không thuộc đơn.');
            setScanLogs(prev => [{ time: timeStr, code, status: 'Không có mã này — nhập lại', matched: false }, ...prev]);
            const wrongDetail = result?.wrongItem
              ? {
                  ...result.wrongItem,
                  productId: result.wrongItem.productId || result.wrongItem.sku || code,
                  brand: result.wrongItem.brand || result.wrongItem.brandName || '',
                }
              : {
                  productId: code,
                  name: result?.productName || 'Sản phẩm không thuộc đơn',
                  brand: result?.brandName || result?.brand || '',
                  size: result?.size || '',
                  belongsToOrderNo: result?.belongsToOrderNo || '',
                };
            setWrongItem(wrongDetail);
            setWrongItemModalOpen(true);
          }
          setSku('');
        },
        onError: (err) => {
          setMessage(err?.message || 'Không tìm thấy sản phẩm với mã này.');
          setScanLogs(prev => [{ time: timeStr, code, status: 'Mã không tồn tại', matched: false }, ...prev]);
          setSku('');
        },
      });
    } finally {
      lock.current = false;
      if (alive.current && !signal.aborted) {
        input.current?.focus();
      }
    }
  };

  const create = async () => {
    if (actionBlocked('shipment', { lock, uncertain, resource })) return;
    if (!hasPackingPhotos(order, packingPhotos)) {
      setPackingPhotosError('Vui lòng tải ít nhất 1 ảnh đóng gói trước khi tạo vận đơn GHN.');
      return;
    }
    if (!canShip(order, scope, now, packingPhotos)) return;
    lock.current = true;
    readEpoch.current++;
    setUncertain(true);
    try {
      await resource.mutate(options => packingService.shipment(resolvedOrderId, options), {
        onSuccess: () => {
          changed();
          setPrintModalOpen(true); // Tự động mở tùy chọn in phiếu sau khi tạo vận đơn GHN thành công
        },
      });
    } finally {
      readEpoch.current++;
      lock.current = false;
      if (alive.current && !signal.aborted) { resource.refresh(); onChanged(); }
    }
  };

  const handoverGhn = async () => {
    if (handoverLoading || lock.current || !canHandoverToGhn(order) || !operationReady('ghnHandover')) return false;
    lock.current = true;
    setHandoverLoading(true);
    try {
      let ok = false;
      await resource.mutate(options => packingService.handoverOrder(resolvedOrderId, options), {
        onSuccess: () => {
          ok = true;
          setMessage('Đã xác nhận bàn giao kiện hàng cho GHN.');
          changed();
        },
      });
      return ok;
    } finally {
      lock.current = false;
      if (alive.current && !signal.aborted) {
        setHandoverLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!lock.current && order?.readEpoch === readEpoch.current &&
        (order.ghnTrackingCode || order.shipmentOutcome === 'NOT_CREATED')) setUncertain(false);
  }, [order]);

  const items = order?.items || [];
  const scannedProductIds = order?.scannedProductIds || [];
  const scannedCount = order?.scannedCount ?? scannedProductIds.length;
  const totalCount = order?.totalCount ?? items.length;

  return {
    resource,
    order,
    totalCount,
    scannedCount,
    items,
    pickedItems,
    scannedProductIds,
    togglePicked,
    scope,
    now,
    scan,
    sku,
    input,
    setSku,
    uncertain,
    setCamera,
    message,
    create,
    handoverGhn,
    handoverLoading,

    scanLogs,

    camera,
    wrongItemModalOpen,
    setWrongItemModalOpen,
    wrongItem,
    printModalOpen,
    setPrintModalOpen,

    sections: {
      PackingItemTable: { items, pickedItems, scannedProductIds, togglePicked },
      PackingPhotosPanel: {
        photos: packingPhotos,
        canEdit: canEditPhotos,
        lockedByShipment: Boolean(order?.ghnTrackingCode),
        uploading: packingPhotosUploading,
        saving: packingPhotosSaving,
        error: packingPhotosError,
        onUpload: uploadPackingPhotos,
        onRemove: removePackingPhoto,
      },
      PackingScanPanel: {
        totalCount,
        order,
        scope,
        now,
        scan,
        sku,
        input,
        setSku,
        uncertain,
        resource,
        setCamera,
        message,
        create,
        packingPhotos,
        packingPhotosBusy: packingPhotosUploading || packingPhotosSaving,
        canEditPhotos,
      },
    },
  };
}

function actionBlocked(operation, { lock, uncertain, resource }) {
  if (!operationReady(operation)) return true;
  return lock.current || uncertain || resource.loading;
}
