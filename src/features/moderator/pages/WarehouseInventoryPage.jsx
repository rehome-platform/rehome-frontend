import { WarehouseHistoryTabs } from '../components/WarehouseHistoryTabs.jsx';
import DegradedCaseDetails from '../components/DegradedCaseDetails.jsx';
import { degradedCaseLabel, degradedInventoryItem } from '../models/degradedCaseModel.js';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDebouncedSearch } from '../../../hooks/useDebouncedSearch.js';
import Button, { getButtonClasses } from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import TableActionButton from '../../../components/common/TableActionButton.jsx';
import ImageLightbox from '../../../components/common/ImageLightbox.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { returnService, pendingReturnFromInventory } from '../services/returnApi.js';
import { enrichListRows } from '../services/listDetailEnrichment.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { STATIC_STALE_TIME_MS, useModeratorCache, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems } from '../models/warehouseModel.js';
import { Page, Status, Pager, ResourceState, money } from '../components/WarehouseUi.jsx';
import { ReturnOutcomeDialog } from '../components/returns/ReturnSections.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_TABS,
  productStatusKey,
  productStatusLabelByKey,
  resolveProductStatusLabel,
} from '../../../constants/productStatus.js';
import { TABLE_COLUMN_LABELS } from '../../../constants/tableColumns.js';

export const SUPPORTED_INVENTORY_STATUSES = [
  'ON_SALE',
  'WAREHOUSE',
  'RESERVED',
  'SOLD',
  'WITHDRAWN',
  'UNCLAIMED',
  'DONATED',
  'DESTROYED',
  'PLATFORM_OWNED',
];

export const INVENTORY_STATUS_LABELS = {
  ...PRODUCT_STATUS_LABELS,
  WAREHOUSE: productStatusLabelByKey('WAREHOUSE'),
  DEGRADED: productStatusLabelByKey('DEGRADED'),
  TERM_EXPIRED: productStatusLabelByKey('WAREHOUSE_TERM_EXPIRED'),
  PLATFORM_FINAL: 'Tài sản nền tảng / Đã xử lý',
};

function resolveInventoryPhotos(item) {
  if (!item) return [];
  const rawList = [];
  if (Array.isArray(item.photos)) {
    for (const p of item.photos) {
      const url = typeof p === 'string' ? p : p?.url || p?.imageUrl;
      if (url && typeof url === 'string' && url.trim()) rawList.push(url.trim());
    }
  }
  const singleCandidates = [
    item.thumbnailUrl,
    item.photoUrl,
    item.imageUrl,
    item.coverPhoto,
    item.productPhotoUrl,
  ];
  for (const url of singleCandidates) {
    if (url && typeof url === 'string' && url.trim()) rawList.push(url.trim());
  }
  return Array.from(new Set(rawList));
}

function InventoryThumbnailCell({ item, onZoom }) {
  const photos = useMemo(() => resolveInventoryPhotos(item), [item]);
  const thumbSrc = photos[0] || null;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [thumbSrc]);

  if (thumbSrc && !imgFailed) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onZoom(photos, item?.name || item?.sku || 'Ảnh sản phẩm');
        }}
        className="group relative w-11 h-11 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] overflow-hidden flex items-center justify-center shrink-0 cursor-zoom-in hover:ring-2 hover:ring-[#006B2C]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C]/40"
        title={`Phóng to ảnh ${item?.name || 'sản phẩm'}`}
      >
        <img
          src={thumbSrc}
          alt={item?.name || 'Ảnh sản phẩm'}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </button>
    );
  }

  return (
    <div
      data-testid="inventory-thumb-fallback"
      title="Chưa có ảnh sản phẩm"
      aria-label="Chưa có ảnh sản phẩm"
      className="w-11 h-11 rounded-xl border border-dashed border-[#D0D7CE] bg-[#F6F9F4] text-[#8A948C] flex items-center justify-center shrink-0"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M21 15l-4.5-4.5a1.5 1.5 0 0 0-2.1 0L7 18" />
      </svg>
    </div>
  );
}

export default function WarehouseInventoryPage() {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const [scanner, setScanner] = useState(false);
  const [degradedModalItem, setDegradedModalItem] = useState(null);
  const [relistTarget, setRelistTarget] = useState(null);
  const [relistSubmitting, setRelistSubmitting] = useState(false);
  const [lightboxState, setLightboxState] = useState(null);
  const relistLock = useRef(false);
  const toast = useToast();
  const cache = useModeratorCache();

  const page = Math.max(0, Number(search.get('page')) || 0);
  const sku = search.get('sku') || '';
  const [skuInput, setSkuInput] = useState(sku);
  const { debouncedQuery: debouncedSku, isTooShort: isSkuTooShort, hint: skuHint } = useDebouncedSearch(skuInput);
  const rawStatus = search.get('status') || '';
  const status = rawStatus === 'WAITING_END_OF_TERM' ? 'TERM_EXPIRED' : rawStatus;
  const linkedCaseId = search.get('caseId');

  useEffect(() => {
    setSkuInput(sku);
  }, [sku]);

  useEffect(() => {
    if (debouncedSku === sku) return;
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous);
        debouncedSku ? next.set('sku', debouncedSku) : next.delete('sku');
        next.set('page', '0');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSku, sku, setSearch]);

  React.useEffect(() => {
    if (linkedCaseId) setDegradedModalItem({ caseId: linkedCaseId });
  }, [linkedCaseId]);

  const closeDegradedCase = () => {
    setDegradedModalItem(null);
    if (linkedCaseId) setSearch(previous => { const next = new URLSearchParams(previous); next.delete('caseId'); return next; }, { replace: true });
  };

  const resource = useResource(
    async (options) => {
      if (status === 'DEGRADED') {
        const degradedList = await inventoryService.degradedCases({ status: '' }, options);
        const mapped = (degradedList || []).map(degradedInventoryItem);
        const enriched = await enrichListRows(
          mapped,
          (item) => item.sku && (item.currentTerm == null || item.daysIntoTerm == null),
          async (item) => {
            const detail = await inventoryService.read(item.sku, options);
            return {
              ...item,
              currentTerm: detail.currentTerm ?? item.currentTerm,
              daysIntoTerm: detail.daysIntoTerm ?? item.daysIntoTerm,
              currentPrice: detail.currentPrice ?? item.currentPrice,
              agreedPrice: item.agreedPrice ?? detail.agreedPrice ?? detail.currentPrice,
              photos: item.photos?.length ? item.photos : detail.photos,
              thumbnailUrl: item.thumbnailUrl || detail.thumbnailUrl || null,
            };
          },
          options,
        );
        const keyword = sku.trim().toLowerCase();
        const filtered = keyword
          ? enriched.filter(
              (item) =>
                String(item.sku || '').toLowerCase().includes(keyword) ||
                String(item.name || '').toLowerCase().includes(keyword)
            )
          : enriched;
        return {
          items: filtered,
          content: filtered,
          totalElements: filtered.length,
          totalPages: 1,
        };
      }
      return inventoryService.list({ page, sku, status }, { ...options, enrichDetails: true });
    },
    [page, sku, status],
    { cacheKey: `inventory:list:${status || 'ALL'}:${sku.trim()}:${page}` },
  );

  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
    { cacheKey: 'enums:warehouse', staleTime: STATIC_STALE_TIME_MS },
  );

  const rawItems = listItems(resource.data);
  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      const counterA = a?.reConsignStatus === 'COUNTER_OFFERED' ? 0 : 1;
      const counterB = b?.reConsignStatus === 'COUNTER_OFFERED' ? 0 : 1;
      if (counterA !== counterB) return counterA - counterB;
      const tA = Date.parse(a?.createdAt || a?.stockedAt || a?.updatedAt || a?.degradedDate || '') || 0;
      const tB = Date.parse(b?.createdAt || b?.stockedAt || b?.updatedAt || b?.degradedDate || '') || 0;
      return tB - tA;
    });
  }, [rawItems]);

  const pendingReturnBySku = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const ret = item.status === 'RETURNED' ? pendingReturnFromInventory(item) : null;
      if (ret) map.set(String(item.sku || item.id || '').trim().toUpperCase(), ret);
    }
    return map;
  }, [items]);

  const handleConfirmRelist = async (outcome) => {
    if (!relistTarget || relistLock.current) return;
    relistLock.current = true;
    setRelistSubmitting(true);
    try {
      await returnService.applyItemAction(relistTarget.id, outcome);
      toast.success(`Đã đăng bán lại sản phẩm ${relistTarget.sku || relistTarget.itemName || ''} lên sàn.`);
      setRelistTarget(null);
      cache?.invalidate(['inventory:', 'returns:', 'queue:', 'history:']);
      resource.refresh();
    } catch (err) {
      toast.error(err?.message || 'Không thể đăng bán lại sản phẩm. Vui lòng thử lại.');
    } finally {
      relistLock.current = false;
      setRelistSubmitting(false);
    }
  };

  const change = (key, value) =>
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous);
        value ? next.set(key, value) : next.delete(key);
        if (key !== 'page') next.set('page', '0');
        return next;
      },
      { replace: true },
    );

  // 9 tab trạng thái sản phẩm + tab "Tất cả"
  const statusTabs = [
    { label: 'Tất cả', value: '' },
    ...PRODUCT_TABS.map(({ label, value }) => ({ label, value })),
  ];

  return (
    <Page
      title={
        <div className="flex items-baseline gap-3">
          <span>Quản lý sản phẩm</span>
          <span className="text-xs font-normal text-[#5f5f5f]">
            · {resource.data?.totalElements || items.length} sản phẩm tại điểm kí gửi
          </span>
        </div>
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" className="whitespace-nowrap" onClick={() => setScanner(true)}>
            Quét QR Mã hàng hóa
          </Button>
          <Button variant="outline" className="gap-1.5 whitespace-nowrap" onClick={resource.refresh}>
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Tải lại</span>
          </Button>
        </div>
      }
    >

      <WarehouseHistoryTabs type="INVENTORY">
      {/* 1. KHUNG TÌM KIẾM & BỘ LỌC (TK-01) */}
      <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-4">
        {/* Hàng Tab Trạng Thái Nhanh Chuẩn TK-01 */}
        <div className="flex flex-wrap gap-2 pb-3 border-b border-[#ececec]">
          {statusTabs.map((tab) => {
            const isActive = (status || '') === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => change('status', tab.value)}
                className={`text-xs px-3.5 py-1.5 rounded-xl border font-semibold transition-colors ${isActive
                  ? 'bg-[#006B2C] text-white border-[#006B2C]'
                  : 'bg-white text-textSecondary border-neutral hover:bg-[#F6F9F4]'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#191C19]">Mã hàng hóa hoặc tên</label>
              {skuInput.trim() && (
                <button
                  type="button"
                  onClick={() => navigate(`/moderator/inventory/${encodeURIComponent(skuInput.trim())}`)}
                  className="text-[11px] text-[#006B2C] font-semibold hover:underline"
                >
                  Mở chi tiết Mã hàng hóa →
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="VD: RH-M4T19B, RH-C2M08P..."
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && skuInput.trim()) {
                  e.preventDefault();
                  navigate(`/moderator/inventory/${encodeURIComponent(skuInput.trim())}`);
                }
              }}
              className="w-full rounded-xl border border-[#8a8a8a] px-3.5 py-2 text-xs font-mono font-bold focus:border-[#006B2C] focus:outline-none"
            />
            {isSkuTooShort && (
              <p className="mt-1 text-[11px] text-[#5f5f5f]">{skuHint}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1">Lọc theo trạng thái</label>
            <select
              className="w-full rounded-xl border border-[#8a8a8a] bg-white px-3.5 py-2 text-xs font-semibold focus:border-[#006B2C] focus:outline-none"
              value={status}
              onChange={(e) => change('status', e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {Array.from(
                new Set([
                  ...SUPPORTED_INVENTORY_STATUSES,
                  'RETURNED',
                  'DEGRADED',
                  'TERM_EXPIRED',
                  'PLATFORM_FINAL',
                  ...(Array.isArray(enums.data?.inventoryStatuses) ? enums.data.inventoryStatuses : []),
                ])
              ).map((value) => (
                <option key={value} value={value}>
                  {INVENTORY_STATUS_LABELS[value] || productStatusLabelByKey(value)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ResourceState resource={resource} empty={!items.length} />

      {/* 2. BẢNG TỒN KHO / BẢNG HÀNG XUỐNG CẤP CHUYÊN BIỆT */}
      {!!items.length && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {status === 'DEGRADED' ? (
                <table className="min-w-[700px] w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FFFAEB] border-b border-[#FEDF89] text-[10px] font-bold uppercase tracking-wider text-[#B54708] whitespace-nowrap">
                      <th className="py-3 px-4 w-16">Ảnh</th>
                      <th className="py-3 px-4">Sản phẩm</th>
                      <th className="py-3 px-4 w-28">Ngày báo</th>
                      <th className="py-3 px-4">Lý do xuống cấp</th>
                      <th className="py-3 px-4">Trạng thái đền bù</th>
                      <th className="py-3 px-4 text-right w-44">{TABLE_COLUMN_LABELS.ACTIONS}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {items.map((item) => {
                      const rawBrand = item.brandName || item.brand;
                      const cleanBrand = rawBrand && rawBrand.trim().toLowerCase() !== 'rehome' ? rawBrand.trim() : '';
                      const subMeta = [cleanBrand, item.size ? `Size ${item.size}` : ''].filter(Boolean).join(' · ');
                      return (
                      <tr key={item.sku || item.id} className="hover:bg-[#FFFDF5] transition-colors">
                        <td className="py-3.5 px-4 w-16">
                          <InventoryThumbnailCell
                            item={item}
                            onZoom={(images, title) => setLightboxState({ images, title })}
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#191C19]">{item.name}</p>
                          {subMeta && (
                            <p className="text-[11px] text-[#717971]">{subMeta}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#5f5f5f] whitespace-nowrap">
                          {item.degradedDate && !Number.isNaN(new Date(item.degradedDate).getTime())
                            ? new Date(item.degradedDate).toLocaleDateString('vi-VN')
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate" title={item.degradedReason || item.conditionNote}>
                          <span className="font-medium text-[#191C19]">
                            {item.degradedReason || item.conditionNote || 'Hàng trả về có dấu hiệu xuống cấp'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${item.decisionStatus === 'FULL_COMPENSATION'
                              ? 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]'
                              : (item.decisionStatus === 'PARTIAL_COMPENSATION' || item.decisionStatus === 'PARTIAL_WITH_ITEM_BACK')
                                ? 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]'
                                : item.decisionStatus === 'UNCLAIMED'
                                  ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
                                  : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                            }`}>
                            {item.decisionStatusLabel || degradedCaseLabel(item)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <TableActionButton
                            action="view"
                            label="Xem biên bản & ảnh"
                            onClick={() => setDegradedModalItem(item)}
                          />
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-[700px] w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f] whitespace-nowrap">
                      <th className="py-2.5 px-4 w-16">Ảnh</th>
                      <th className="py-2.5 px-4">Sản phẩm</th>
                      <th className="py-2.5 px-4">{TABLE_COLUMN_LABELS.STATUS}</th>
                      <th className="py-2.5 px-4">Kỳ ký gửi</th>
                      <th className="py-2.5 px-4 text-right">Giá bán</th>
                      <th className="py-2.5 px-4 text-right">{TABLE_COLUMN_LABELS.ACTIONS}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {items.map((item) => {
                      const skuKey = String(item.sku || item.id || '').trim().toUpperCase();
                      const pendingReturn = item.status === 'RETURNED' ? pendingReturnBySku.get(skuKey) || null : null;
                      const isActionNeeded =
                        item.status === 'WAITING_END_OF_TERM' ||
                        item.status === 'UNCLAIMED' ||
                        Boolean(pendingReturn) ||
                        (item.status === 'WAREHOUSE' && (item.decisionId || item.pricingEligible));
                      const rawBrand = item.brandName || item.brand;
                      const cleanBrand = rawBrand && rawBrand.trim().toLowerCase() !== 'rehome' ? rawBrand.trim() : '';
                      const subMeta = [cleanBrand, item.size ? `Size ${item.size}` : ''].filter(Boolean).join(' · ');

                      return (
                        <tr
                          key={item.sku}
                          className={`transition-colors ${isActionNeeded
                            ? 'bg-[#f8f9fa] border-l-4 border-l-[#2b2b2b]'
                            : 'hover:bg-[#fcfdfc]'
                            }`}
                        >
                          <td className="py-2.5 px-4 w-16">
                            <InventoryThumbnailCell
                              item={item}
                              onZoom={(images, title) => setLightboxState({ images, title })}
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#191C19]">{item.name}</p>
                            {subMeta && (
                              <p className="text-[11px] text-[#717971]">{subMeta}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Status label={resolveProductStatusLabel(item)}>
                              {productStatusKey(item)}
                            </Status>
                            {pendingReturn && (
                              <span className="block text-[10px] text-[#B54708] font-semibold mt-0.5">
                                Chờ chọn phương án xử lý
                              </span>
                            )}
                            {item.pricingEligible && item.status === 'WAREHOUSE' && item.reConsignStatus !== 'COUNTER_OFFERED' && (
                              <span className="block text-[10px] text-[#006B2C] font-semibold mt-0.5">
                                Member yêu cầu ký gửi lại
                              </span>
                            )}
                            {item.status === 'WAREHOUSE' && item.reConsignStatus === 'COUNTER_OFFERED' && (
                              <span className="block text-[10px] text-[#B42318] font-bold mt-0.5">
                                Member trả giá ký gửi lại
                              </span>
                            )}
                            {item.status === 'WAREHOUSE' && (item.reConsignStatus === 'PROPOSAL_SENT' || item.reConsignStatus === 'PROPOSED') && <span className="block text-[10px] mt-0.5">Chờ Member xác nhận biên nhận mới</span>}
                            {item.status === 'WAREHOUSE' && item.decisionId && !item.pricingEligible && !['PROPOSAL_SENT', 'PROPOSED', 'COUNTER_OFFERED'].includes(item.reConsignStatus) && <span className="block text-[10px] mt-0.5">Chờ Member chọn phương án cuối kỳ</span>}
                            {item.decision === 'TAKE_BACK' && item.status === 'WITHDRAWN' && (
                              <span className="block text-[10px] text-amber-800 font-semibold mt-0.5">
                                Khách yêu cầu nhận lại
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[#5f5f5f] whitespace-nowrap">
                            {item.currentTerm ? `Kỳ ${item.currentTerm} · ngày ${item.daysIntoTerm ?? 1}${item.termLengthDays ? ` / ${item.termLengthDays}` : ''}` : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#191C19] text-right whitespace-nowrap">
                            {item.currentPrice != null ? money(item.currentPrice) : (item.agreedPrice != null ? money(item.agreedPrice) : '—')}
                          </td>
                          <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {pendingReturn ? (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="whitespace-nowrap"
                                  onClick={() => setRelistTarget(pendingReturn)}
                                >
                                  Đăng bán lại
                                </Button>
                              ) : null}
                              {(item.pricingEligible || ['PROPOSAL_SENT', 'PROPOSED', 'COUNTER_OFFERED'].includes(item.reConsignStatus)) && ['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(item.status) ? (
                                <Link
                                  to={`/moderator/inventory/${encodeURIComponent(item.sku)}/re-consign`}
                                  className={getButtonClasses({ variant: 'primary', size: 'sm', className: 'whitespace-nowrap' })}
                                >
                                  {item.reConsignStatus === 'COUNTER_OFFERED'
                                    ? 'Phản hồi trả giá'
                                    : (item.reConsignStatus === 'PROPOSAL_SENT' || item.reConsignStatus === 'PROPOSED')
                                      ? 'Theo dõi xác nhận'
                                      : 'Đàm phán giá'}
                                </Link>
                              ) : item.status === 'RETURNED' ? (
                                <Link
                                  to={`/moderator/inventory/${encodeURIComponent(item.sku)}`}
                                  className={getButtonClasses({ variant: 'danger-outline', size: 'sm', className: 'whitespace-nowrap' })}
                                >
                                  Báo xuống cấp
                                </Link>
                              ) : null}
                              <TableActionButton
                                action="view"
                                to={`/moderator/inventory/${encodeURIComponent(item.sku)}`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phân trang */}
      {!!resource.data && resource.data.totalPages > 1 && (
        <Pager
          page={page}
          totalPages={resource.data.totalPages}
          onChange={(value) => change('page', String(value))}
        />
      )}

      {/* Modal Quét QR SKU */}
      <QRScannerModal
        isOpen={scanner}
        onClose={() => setScanner(false)}
        title="Quét QR Mã hàng hóa sản phẩm"
        placeholder="Nhập Mã hàng hóa sản phẩm"
        onScanSuccess={(value) => {
          setScanner(false);
          navigate(`/moderator/inventory/${encodeURIComponent(value)}`);
        }}
      />

      {/* MODAL XEM BIÊN BẢN & ẢNH HÀNG XUỐNG CẤP (Decision 1) */}
      {degradedModalItem && (
        <Modal
          isOpen={!!degradedModalItem}
          onClose={closeDegradedCase}
          title="Biên bản hàng xuống cấp"
        >
          <DegradedCaseDetails
            caseId={degradedModalItem.caseId}
            onNavigateToCounter={() => navigate('/moderator/counter')}
          />
        </Modal>
      )}

      {/* MODAL CHỌN ĐĂNG BÁN LẠI MÓN HÀNG ĐÃ BÀN GIAO */}
      <ReturnOutcomeDialog
        isOutcomeModalOpen={Boolean(relistTarget)}
        setIsOutcomeModalOpen={(open) => {
          if (!open && !relistLock.current) setRelistTarget(null);
        }}
        selectedItem={relistTarget}
        submitting={relistSubmitting}
        handleConfirmOutcome={handleConfirmRelist}
      />

      {lightboxState && (
        <ImageLightbox
          isOpen={Boolean(lightboxState)}
          onClose={() => setLightboxState(null)}
          images={lightboxState?.images || []}
          initialIndex={0}
          categoryLabel={lightboxState?.title || 'Ảnh sản phẩm'}
        />
      )}
      </WarehouseHistoryTabs>
    </Page>
  );
}
