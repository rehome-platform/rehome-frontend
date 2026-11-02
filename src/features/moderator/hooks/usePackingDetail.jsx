import React, { useRef, useState, useEffect } from "react";

import { usePhase2, useResource } from "./warehouseHooks.jsx";

import { packingService } from "../services/packingApi.js";
import { canPack, canShip } from "../models/packingModel.js";
import { operationReady } from "../config/packingContract.js";
import { packingMockApi } from "../services/packingMockApi.js";

export function usePackingDetail({ orderId, onChanged }) {
  const { scope, signal } = usePhase2();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const readEpoch = useRef(0);
  const resource = useResource(async options => {
    const epoch = readEpoch.current;
    return { ...await packingService.read(orderId, options), readEpoch: epoch };
  }, [orderId], {
    poll: true, done: data => !!data?.ghnTrackingCode,
  });

  const [sku, setSku] = useState('');
  const [camera, setCamera] = useState(false);
  const [message, setMessage] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [pickedItems, setPickedItems] = useState({});
  const [scanLogs, setScanLogs] = useState([]);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentNote, setIncidentNote] = useState('');

  // Trạng thái modal cảnh báo sai món (DG-03-SaiMon) & in phiếu (DG-04)
  const [wrongItemModalOpen, setWrongItemModalOpen] = useState(false);
  const [wrongItem, setWrongItem] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [packageWeight, setPackageWeight] = useState(820);
  const [packageDimensions, setPackageDimensions] = useState('30 x 22 x 10');
  const [shipperNote, setShipperNote] = useState('Giao giờ hành chính, gọi trước khi tới.');

  const lock = useRef(false);
  const input = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const order = resource.data;
  const changed = () => { onChanged(); window.dispatchEvent(new Event('warehouse:changed')); };

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
      await resource.mutate(options => packingService.scan(orderId, code, options), {
        onSuccess: result => {
          if (result.matched) {
            setMessage('Đã đối chiếu SKU. Tiến độ được tải lại từ server.');
            setScanLogs(prev => [{ time: timeStr, code, status: 'Khớp — món thành công', matched: true }, ...prev]);
            setWrongItem(null);
          } else {
            setMessage('SKU không thuộc đơn.');
            setScanLogs(prev => [{ time: timeStr, code, status: 'Không có mã này — nhập lại', matched: false }, ...prev]);
            const wrongDetail = packingMockApi.findWrongItemInfo(code);
            setWrongItem(wrongDetail);
            setWrongItemModalOpen(true);
          }
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

  const create = async (customPayload = {}) => {
    const extra = (customPayload && typeof customPayload === 'object' && !customPayload.nativeEvent && !customPayload.target)
      ? customPayload
      : {};
    if (actionBlocked('shipment', { lock, uncertain, resource })) return;
    if (!canShip(order, scope, now)) return;
    lock.current = true;
    readEpoch.current++;
    setUncertain(true);
    try {
      const payload = {
        weightGrams: packageWeight,
        dimensions: packageDimensions,
        shipperNote,
        ...extra,
      };
      await resource.mutate(options => packingService.shipment(orderId, { ...options, data: payload }), {
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
    setIncidentOpen,
    scanLogs,
    incidentOpen,
    setIncidentNote,
    incidentNote,
    camera,
    wrongItemModalOpen,
    setWrongItemModalOpen,
    wrongItem,
    printModalOpen,
    setPrintModalOpen,
    packageWeight,
    setPackageWeight,
    packageDimensions,
    setPackageDimensions,
    shipperNote,
    setShipperNote,
    sections: {
      PackingItemTable: { items, pickedItems, scannedProductIds, togglePicked },
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
        setIncidentOpen,
        packageWeight,
        setPackageWeight,
        packageDimensions,
        setPackageDimensions,
        shipperNote,
        setShipperNote,
      },
      PackingIncidentDialog: { setIncidentOpen, setIncidentNote, incidentNote },
    },
  };
}

function actionBlocked(operation, { lock, uncertain, resource }) {
  if (!operationReady(operation)) return true;
  return lock.current || uncertain || resource.loading;
}
