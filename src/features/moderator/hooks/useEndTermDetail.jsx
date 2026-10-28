import React, { useState, useMemo } from "react";

import { endTermService } from "../services/warehouseApi.js";
import { phase2Contract, isFixtureMode } from "../config/warehouseContract.js";
import { usePhase2, useResource } from "./warehouseHooks.jsx";
import { validatePartnerName, canTransferUnclaimed, normalizeUnclaimedItem } from "../models/warehouseModel.js";

import { packingService } from "../services/packingApi.js";
import { handoverPayload } from "../models/packingModel.js";
import { operationReady } from "../config/packingContract.js";

export function useEndTermDetail({ sku, onClose, onChanged }) {
  const { identity, scope } = usePhase2();
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resource = useResource((options) => endTermService.read(sku, options), [sku]);
  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );

  const [price, setPrice] = useState('');
  const [term, setTerm] = useState('');
  const [partner, setPartner] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const rawData = resource.data;
  const data = useMemo(() => (rawData ? normalizeUnclaimedItem(rawData) : null), [rawData]);

  const identified = isFixtureMode
    ? !!identity && identity.memberId === data?.memberId
    : operationReady('handover') && !!handoverPayload(data, identity, scope, now);

  const success = (result) => {
    if (result?.receiptId) setReceiptId(result.receiptId);
    if (confirm === 'TRANSFER') {
      setFeedback({
        type: 'success',
        message: `Đã chuyển giao thành công sản phẩm SKU ${sku} cho tổ chức "${partner.trim()}". Trạng thái sản phẩm đổi sang ĐÃ CHUYỂN GIAO (DONATED).`,
      });
    }
    setConfirm(null);
    onChanged();
    window.dispatchEvent(new Event('warehouse:changed'));
  };

  const partnerValidation = useMemo(() => validatePartnerName(partner), [partner]);

  const run = () => {
    if (!data) return;
    if (confirm === 'HANDOVER' && !identified) return;
    if (confirm === 'TRANSFER' && !partnerValidation.valid) return;

    const action =
      confirm === 'HANDOVER'
        ? (options) =>
            isFixtureMode
              ? endTermService.handover(sku, { identityToken: identity.identityToken }, options)
              : packingService.handover(data, identity, options)
        : confirm === 'RE_CONSIGN'
          ? (options) =>
              endTermService.reconsign(
                sku,
                { agreedPrice: Number(price), termLengthDays: Number(term) },
                options,
              )
          : (options) => endTermService.transfer(sku, partner.trim(), options);

    resource.mutate(action, { onSuccess: success });
  };

  const isDonated = data?.status === 'DONATED';
  const showTransfer = canTransferUnclaimed(data) && !isDonated;

    return {
    resource,
    feedback,
    setFeedback,
    data,
    isDonated,
    showTransfer,
    partner,
    setPartner,
    partnerValidation,
    setConfirm,
    identified,
    price,
    setPrice,
    term,
    setTerm,
    enums,
    receiptId,
    confirm,
    run,
      sections: {
      EndTermTransferPanel: { partner, setPartner, partnerValidation, resource, setConfirm },
      EndTermReconsignPanel: { price, setPrice, resource, term, setTerm, enums, setConfirm },
    },
  };
}
