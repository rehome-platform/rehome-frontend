import React, { useRef, useState, useEffect } from "react";

import { usePhase2, useResource } from "./warehouseHooks.jsx";

import { packingService } from "../services/packingApi.js";
import { canPack, canShip } from "../models/packingModel.js";
import { operationReady } from "../config/packingContract.js";

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
          } else {
            setMessage('SKU không thuộc đơn.');
            setScanLogs(prev => [{ time: timeStr, code, status: 'Không có mã này — nhập lại', matched: false }, ...prev]);
          }
          setSku('');
        },
      });
    } finally {
      lock.current = false;
      if (alive.current && !signal.aborted) {
        resource.refresh();
        onChanged();
        input.current?.focus();
      }
    }
  };

  const create = async () => {
    if (actionBlocked('shipment', { lock, uncertain, resource })) return;
    if (!canShip(order, scope, now)) return;
    lock.current = true;
    readEpoch.current++;
    setUncertain(true);
    try {
      await resource.mutate(options => packingService.shipment(orderId, options), {
        onSuccess: changed,
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
      sections: {
      PackingItemTable: { items, pickedItems, scannedProductIds, togglePicked },
      PackingScanPanel: { totalCount, order, scope, now, scan, sku, input, setSku, uncertain, resource, setCamera, message, create, setIncidentOpen },
      PackingIncidentDialog: { setIncidentOpen, setIncidentNote, incidentNote },
    },
  };
}

function actionBlocked(operation, { lock, uncertain, resource }) {
  if (!operationReady(operation)) return true;
  return lock.current || uncertain || resource.loading;
}
