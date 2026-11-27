import React, { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import ImageLightbox from '../../../components/common/ImageLightbox.jsx';
import Spinner from '../../../components/common/Spinner.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import { CAMPAIGN_STATUS_LABELS, donationService, isCampaignActive } from '../services/donationApi.js';
import { STATIC_STALE_TIME_MS, useModeratorCache, useResource } from '../hooks/warehouseHooks.jsx';
import { normalizeError } from '../models/warehouseModel.js';
import { Page, Card, ResourceState, date } from '../components/WarehouseUi.jsx';
import { formatWarehouseDisplayName } from '../../../utils/formatters.js';

function extractNoteDetails(note) {
  const noteText = note || '';
  const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  const photos = [];
  let match;
  while ((match = imgRegex.exec(noteText)) !== null) {
    photos.push(match[2]);
  }
  const cleanText = noteText.replace(imgRegex, '').replace(/Ảnh hiện vật:\s*/g, '').trim();
  return { cleanText, photos };
}

function getDonationRowDetails(row) {
  const { cleanText, photos: notePhotos } = extractNoteDetails(row?.note);
  const photoUrls = Array.isArray(row?.photoUrls) && row.photoUrls.length > 0 ? row.photoUrls : notePhotos;
  return { cleanText, photos: photoUrls };
}

function formatHeldDuration(heldAt) {
  if (!heldAt) return '';
  const ms = Date.now() - new Date(heldAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return 'Dưới 1 giờ';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} ngày ${remHours} giờ trước` : `${days} ngày trước`;
}

export default function DonationsPage() {
  const toast = useToast();
  const cache = useModeratorCache();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedDonationId = searchParams.get('donationId') || '';
  const initialCampaignFilter = searchParams.get('campaignId') || '';
  const initialDonorName = searchParams.get('donorName') || '';
  const initialDonationTab = searchParams.get('tab') === 'ON_HOLD' ? 'ON_HOLD' : 'LIST';

  const [donationTab, setDonationTab] = useState(initialDonationTab);
  const [campaignView, setCampaignView] = useState('ACTIVE');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignPage, setCampaignPage] = useState(0);
  const campaignPageSize = 20;

  const [campaignFilter, setCampaignFilter] = useState(initialCampaignFilter);
  const [statusFilter, setStatusFilter] = useState('');

  // Form ghi nhận lượt quyên góp trực tiếp (Luồng A)
  const [recordModalOpen, setRecordModalOpen] = useState(Boolean(initialDonorName));
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [donorName, setDonorName] = useState(initialDonorName);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [note, setNote] = useState('');
  const [donationPhotos, setDonationPhotos] = useState([]);
  const [donationPhotosPending, setDonationPhotosPending] = useState(false);
  const [recordError, setRecordError] = useState(null);
  const [recording, setRecording] = useState(false);

  const onDonationPhotosChange = useCallback((urls, pending) => {
    setDonationPhotos(urls);
    setDonationPhotosPending(pending);
  }, []);

  // Chọn các lượt chờ lấy để bàn giao cho tổ chức (F-165)
  const [selectedIds, setSelectedIds] = useState([]);
  const [handoverConfirmOpen, setHandoverConfirmOpen] = useState(false);
  const [confirmRecipient, setConfirmRecipient] = useState(false);
  const [confirmItems, setConfirmItems] = useState(false);
  const [handoverError, setHandoverError] = useState(null);
  const [handingOver, setHandingOver] = useState(false);

  // Chọn các lượt tạm giữ (ON_HOLD) để chuyển sang chiến dịch khác
  const [selectedOnHoldIds, setSelectedOnHoldIds] = useState([]);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignCampaignId, setReassignCampaignId] = useState('');
  const [reassignError, setReassignError] = useState(null);
  const [reassigning, setReassigning] = useState(false);

  // Bỏ ẩn chiến dịch (HIDDEN -> OPEN/CLOSED)
  const [unhideTarget, setUnhideTarget] = useState(null);
  const [unhideReason, setUnhideReason] = useState('');
  const [unhideError, setUnhideError] = useState(null);
  const [unhiding, setUnhiding] = useState(false);

  // Xem ảnh hiện vật kích thước lớn
  const [lightboxState, setLightboxState] = useState(null);

  const warehouses = useResource((options) => donationService.myWarehouses(options), [], {
    cacheKey: 'donations:myWarehouses',
    staleTime: STATIC_STALE_TIME_MS,
  });
  const warehouse = Array.isArray(warehouses.data) ? warehouses.data[0] : null;
  const warehouseId = warehouse?.id || null;

  const campaignsResource = useResource(
    (options) =>
      warehouseId
        ? donationService.warehouseCampaigns(
            warehouseId,
            { view: campaignView, q: campaignSearch, page: campaignPage, size: campaignPageSize },
            options,
          )
        : Promise.resolve({ items: [], page: 0, size: campaignPageSize, totalElements: 0, totalPages: 0 }),
    [warehouseId, campaignView, campaignSearch, campaignPage],
    {
      enabled: Boolean(warehouseId),
      cacheKey: warehouseId ? `donations:campaigns:${warehouseId}:${campaignView}:${campaignSearch}:${campaignPage}` : null,
    },
  );

  const donationsResource = useResource(
    (options) =>
      warehouseId
        ? donationService.listDonations(
            warehouseId,
            { campaignId: campaignFilter || undefined, status: statusFilter || undefined },
            options,
          )
        : Promise.resolve([]),
    [warehouseId, campaignFilter, statusFilter],
    {
      enabled: Boolean(warehouseId),
      cacheKey: warehouseId ? `donations:list:${warehouseId}:${campaignFilter || 'all'}:${statusFilter || 'all'}` : null,
    },
  );

  const onHoldDonationsResource = useResource(
    (options) =>
      warehouseId
        ? donationService.listDonations(warehouseId, { status: 'ON_HOLD' }, options)
        : Promise.resolve([]),
    [warehouseId],
    {
      enabled: Boolean(warehouseId),
      cacheKey: warehouseId ? `donations:onHold:${warehouseId}` : null,
    },
  );

  const activeCampaignsForReassignResource = useResource(
    (options) =>
      warehouseId
        ? donationService.warehouseCampaigns(warehouseId, { view: 'ACTIVE', page: 0, size: 50 }, options)
        : Promise.resolve({ items: [] }),
    [warehouseId],
    { enabled: Boolean(warehouseId) && reassignModalOpen },
  );

  const campaignsPageData = campaignsResource.data || {};
  const campaigns = useMemo(
    () =>
      Array.isArray(campaignsPageData.items)
        ? campaignsPageData.items
        : Array.isArray(campaignsPageData)
          ? campaignsPageData
          : [],
    [campaignsPageData],
  );
  const campaignTotalPages = campaignsPageData.totalPages ?? (campaigns.length > 0 ? 1 : 0);
  const donations = useMemo(() => {
    const raw = Array.isArray(donationsResource.data) ? donationsResource.data : [];
    return [...raw].sort((a, b) => {
      const tA = a?.createdAt ? Date.parse(a.createdAt) : NaN;
      const tB = b?.createdAt ? Date.parse(b.createdAt) : NaN;
      if (Number.isFinite(tA) && Number.isFinite(tB)) return tB - tA;
      if (Number.isFinite(tB)) return 1;
      if (Number.isFinite(tA)) return -1;
      return 0;
    });
  }, [donationsResource.data]);
  const onHoldDonations = useMemo(() => {
    const raw = Array.isArray(onHoldDonationsResource.data) ? onHoldDonationsResource.data : [];
    return [...raw].sort((a, b) => {
      const tA = a.heldAt ? new Date(a.heldAt).getTime() : Number.MAX_SAFE_INTEGER;
      const tB = b.heldAt ? new Date(b.heldAt).getTime() : Number.MAX_SAFE_INTEGER;
      return tA - tB;
    });
  }, [onHoldDonationsResource.data]);

  const reassignCampaignOptions = useMemo(() => {
    const raw = activeCampaignsForReassignResource.data;
    const list = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
    return list.filter((c) => isCampaignActive(c));
  }, [activeCampaignsForReassignResource.data]);

  const campaignMap = useMemo(() => {
    const map = new Map();
    campaigns.forEach((c) => map.set(String(c.id), c));
    return map;
  }, [campaigns]);

  // Danh sách chiến dịch dùng cho bộ lọc (gộp từ chiến dịch đang mở + chiến dịch xuất hiện trong donations)
  const filterCampaignOptions = useMemo(() => {
    const map = new Map();
    campaigns.forEach((c) => map.set(String(c.id), c.title));
    donations.forEach((d) => {
      if (d.campaignId && !map.has(String(d.campaignId))) {
        map.set(String(d.campaignId), d.campaignTitle || d.campaignId);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [campaigns, donations]);

  const effectiveCampaignId = selectedCampaignId || (campaigns[0]?.id ? String(campaigns[0].id) : '');
  const selectedCampaign = campaignMap.get(String(effectiveCampaignId)) || null;
  const isSelectedCampaignActive = selectedCampaign ? isCampaignActive(selectedCampaign) : false;
  const noOpenCampaigns =
    Boolean(warehouseId) &&
    !campaignsResource.loading &&
    !campaignsResource.error &&
    campaignView === 'ACTIVE' &&
    campaigns.length === 0;
  const isRecordBlocked = noOpenCampaigns || !selectedCampaign || !isSelectedCampaignActive;

  // Nhóm lượt quyên góp theo chiến dịch để Moderator đối chiếu & chọn bàn giao nhanh
  const groupedDonations = useMemo(() => {
    const groups = new Map();
    donations.forEach((row) => {
      const key = String(row.campaignId || 'other');
      if (!groups.has(key)) {
        const camp = campaignMap.get(key);
        groups.set(key, {
          campaignId: row.campaignId || null,
          campaignTitle: row.campaignTitle || camp?.title || row.campaignId || 'Chiến dịch khác',
          organizationName: row.organizationName || camp?.organizationName || '',
          rows: [],
        });
      }
      groups.get(key).rows.push(row);
    });
    return Array.from(groups.values());
  }, [donations, campaignMap]);

  const selectedRows = useMemo(
    () => donations.filter((d) => selectedIds.includes(d.id) && d.status === 'PENDING_PICKUP'),
    [donations, selectedIds],
  );

  const activeHandoverCampaignId = selectedRows[0]?.campaignId || null;
  const activeHandoverOrgId =
    selectedRows[0]?.organizationId ||
    campaignMap.get(String(activeHandoverCampaignId))?.organizationId ||
    null;
  const activeHandoverOrgName =
    selectedRows[0]?.organizationName ||
    campaignMap.get(String(activeHandoverCampaignId))?.organizationName ||
    'Tổ chức tiếp nhận';
  const activeHandoverCampaignTitle =
    selectedRows[0]?.campaignTitle ||
    campaignMap.get(String(activeHandoverCampaignId))?.title ||
    activeHandoverCampaignId;

  const toggleSelect = (row) => {
    if (row.status !== 'PENDING_PICKUP') return;
    const campaignObj = campaignMap.get(String(row.campaignId));
    const rowOrgId = row.organizationId || campaignObj?.organizationId || null;
    if (!row.campaignId || !rowOrgId) return;
    if (
      selectedRows.length > 0 &&
      !selectedIds.includes(row.id) &&
      (String(row.campaignId) !== String(activeHandoverCampaignId) ||
        String(rowOrgId) !== String(activeHandoverOrgId))
    ) {
      setHandoverError('Chỉ được bàn giao các lượt thuộc cùng một chiến dịch và cùng một tổ chức.');
      return;
    }
    setHandoverError(null);
    setSelectedIds((prev) =>
      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id],
    );
  };

  const selectAllPendingInGroup = (group) => {
    const firstEligible = group.rows.find((r) => {
      const camp = campaignMap.get(String(r.campaignId));
      return r.status === 'PENDING_PICKUP' && Boolean(r.campaignId && (r.organizationId || camp?.organizationId));
    });
    if (!firstEligible) return;
    const targetCampaignId = String(firstEligible.campaignId);
    const targetOrgId = String(
      firstEligible.organizationId || campaignMap.get(targetCampaignId)?.organizationId,
    );
    const pendingIds = group.rows
      .filter((r) => {
        const camp = campaignMap.get(String(r.campaignId));
        const orgId = r.organizationId || camp?.organizationId;
        return (
          r.status === 'PENDING_PICKUP' &&
          String(r.campaignId) === targetCampaignId &&
          String(orgId) === targetOrgId
        );
      })
      .map((r) => r.id);
    if (!pendingIds.length) return;
    setHandoverError(null);
    setSelectedIds(pendingIds);
  };

  const handleRecordDonation = async (event) => {
    event.preventDefault();
    if (!warehouseId || isRecordBlocked || recording || donationPhotosPending) return;
    setRecordError(null);
    setRecording(true);
    try {
      const created = await donationService.recordDonation(
        warehouseId,
        {
          campaignId: effectiveCampaignId,
          donorName,
          isAnonymous,
          note: note.trim(),
          photoUrls: donationPhotos,
        },
      );
      toast.success('Đã ghi nhận lượt quyên góp');
      setDonorName('');
      setIsAnonymous(false);
      setNote('');
      setDonationPhotos([]);
      setRecordModalOpen(false);
      cache?.invalidate(['donations:', 'queue:']);
      if (created) {
        donationsResource.setData((prev) => (Array.isArray(prev) ? [created, ...prev] : [created]));
      } else {
        donationsResource.refresh();
      }
    } catch (err) {
      setRecordError(normalizeError(err).message);
    } finally {
      setRecording(false);
    }
  };

  const handleConfirmHandover = async () => {
    if (
      !warehouseId ||
      !selectedRows.length ||
      !activeHandoverCampaignId ||
      !activeHandoverOrgId ||
      !confirmRecipient ||
      !confirmItems ||
      handingOver
    ) {
      return;
    }
    setHandoverError(null);
    setHandingOver(true);
    try {
      const res = await donationService.handoverDonations(
        warehouseId,
        {
          donationIds: selectedRows.map((r) => r.id),
          organizationId: activeHandoverOrgId,
          campaignId: activeHandoverCampaignId,
        },
      );
      const count = res?.handedOverCount ?? selectedRows.length;
      toast.success(`Đã bàn giao ${count} lượt cho ${activeHandoverOrgName}`);
      setSelectedIds([]);
      setConfirmRecipient(false);
      setConfirmItems(false);
      setHandoverConfirmOpen(false);
      cache?.invalidate(['donations:', 'queue:']);
      donationsResource.refresh();
      if (focusedDonationId) {
        const next = new URLSearchParams(searchParams);
        next.delete('donationId');
        setSearchParams(next, { replace: true });
      }
    } catch (err) {
      const normalized = normalizeError(err);
      if (normalized.status === 400) {
        setHandoverError('Danh sách không hợp lệ (có lượt đã bàn giao hoặc khác chiến dịch). Tải lại rồi chọn lại.');
        donationsResource.refresh();
      } else {
        setHandoverError(normalized.message);
      }
    } finally {
      setHandingOver(false);
    }
  };

  const toggleOnHoldSelect = (rowId) => {
    setSelectedOnHoldIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId],
    );
  };

  const openReassignModal = () => {
    if (!selectedOnHoldIds.length) return;
    setReassignError(null);
    setReassignCampaignId('');
    setReassignModalOpen(true);
  };

  const openUnhideModal = (campaign) => {
    setUnhideTarget(campaign);
    setUnhideReason('');
    setUnhideError(null);
  };

  const handleConfirmUnhide = async () => {
    const reason = unhideReason.trim();
    if (!unhideTarget?.id || !reason || unhiding) {
      if (!reason) setUnhideError('Vui lòng nhập lý do bỏ ẩn chiến dịch.');
      return;
    }
    setUnhideError(null);
    setUnhiding(true);
    try {
      await donationService.unhideCampaign(unhideTarget.id, reason);
      toast.success('Đã bỏ ẩn chiến dịch. Các lượt quyên góp đang tạm giữ đã tự động chuyển về "Chờ lấy".');
      setUnhideTarget(null);
      setUnhideReason('');
      cache?.invalidate(['donations:', 'queue:']);
      campaignsResource.refresh();
      donationsResource.refresh();
      onHoldDonationsResource.refresh();
    } catch (err) {
      const normalized = normalizeError(err);
      if (normalized.status === 409 && normalized.code === 'CAMPAIGN_ORGANIZATION_BANNED') {
        setUnhideError('Tổ chức đang bị khoá, mở khoá tổ chức trước');
      } else if (normalized.status === 409 && normalized.code === 'CAMPAIGN_NOT_HIDDEN') {
        setUnhideError('Chiến dịch không còn bị ẩn');
        campaignsResource.refresh();
        donationsResource.refresh();
        onHoldDonationsResource.refresh();
      } else {
        setUnhideError(normalized.message || 'Không thể bỏ ẩn chiến dịch.');
      }
    } finally {
      setUnhiding(false);
    }
  };

  const handleConfirmReassign = async () => {
    const targetCampaignId = reassignCampaignId || (reassignCampaignOptions[0]?.id ? String(reassignCampaignOptions[0].id) : '');
    if (!warehouseId || !selectedOnHoldIds.length || !targetCampaignId || reassigning) return;
    setReassignError(null);
    setReassigning(true);
    try {
      await donationService.reassignDonations(warehouseId, {
        donationIds: selectedOnHoldIds,
        campaignId: targetCampaignId,
      });
      toast.success(`Đã chuyển ${selectedOnHoldIds.length} lượt quyên góp sang chiến dịch mới`);
      setSelectedOnHoldIds([]);
      setReassignModalOpen(false);
      setReassignCampaignId('');
      cache?.invalidate(['donations:', 'queue:']);
      onHoldDonationsResource.refresh();
      donationsResource.refresh();
    } catch (err) {
      const beMessage = err?.response?.data?.message || err?.message;
      const normalized = normalizeError(err);
      setReassignError(beMessage || normalized.message || 'Không thể chuyển sang chiến dịch khác.');
    } finally {
      setReassigning(false);
    }
  };

  const formattedWarehouseName = formatWarehouseDisplayName(warehouse?.name);
  const subtitleText = formattedWarehouseName
    ? (/^(?:địa\s+)?điểm\s+k[iíý]\s+gửi/iu.test(formattedWarehouseName)
        ? formattedWarehouseName
        : `Điểm kí gửi: ${formattedWarehouseName}`)
    : 'Ghi nhận lượt quyên góp trực tiếp và bàn giao cho tổ chức từ thiện';

  return (
    <Page
      title="Quyên góp & Bàn giao tổ chức"
      subtitle={subtitleText}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            campaignsResource.refresh();
            donationsResource.refresh();
            onHoldDonationsResource.refresh();
          }}
        >
          Tải lại
        </Button>
      }
    >
      <ResourceState resource={warehouses} />

      {warehouseId && (
        <div className="space-y-6">
          <Card title="Chiến dịch tại điểm ký gửi">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Chế độ xem chiến dịch" className="inline-flex rounded-xl border border-neutral bg-[#F6F9F4] p-1 gap-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={campaignView === 'ACTIVE'}
                  onClick={() => {
                    setCampaignView('ACTIVE');
                    setCampaignPage(0);
                    setSelectedCampaignId('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    campaignView === 'ACTIVE'
                      ? 'bg-[#006B2C] text-white'
                      : 'text-textSecondary hover:text-text'
                  }`}
                >
                  Chiến dịch đang diễn ra
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={campaignView === 'HISTORY'}
                  onClick={() => {
                    setCampaignView('HISTORY');
                    setCampaignPage(0);
                    setSelectedCampaignId('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    campaignView === 'HISTORY'
                      ? 'bg-[#006B2C] text-white'
                      : 'text-textSecondary hover:text-text'
                  }`}
                >
                  Lịch sử chiến dịch
                </button>
              </div>

              <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                <input
                  type="search"
                  aria-label="Tìm chiến dịch"
                  value={campaignSearch}
                  onChange={(e) => {
                    setCampaignSearch(e.target.value);
                    setCampaignPage(0);
                  }}
                  placeholder="Tìm chiến dịch hoặc tổ chức..."
                  className="w-full sm:w-64 rounded-xl border border-neutral bg-white px-3 py-1.5 text-xs text-text focus:border-[#006B2C] focus:outline-none"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setRecordError(null);
                    setRecordModalOpen(true);
                  }}
                  className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold whitespace-nowrap"
                >
                  Ghi nhận
                </Button>
              </div>
            </div>

            <ResourceState
              resource={campaignsResource}
              empty={!campaigns.length}
              emptyText={
                campaignView === 'HISTORY'
                  ? 'Chưa có lịch sử chiến dịch đã đóng hoặc hết hạn.'
                  : 'Địa điểm này hiện không có chiến dịch nào đang mở.'
              }
            />

            {campaigns.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((c) => {
                  const isSelected = String(c.id) === String(effectiveCampaignId);
                  const active = isCampaignActive(c);
                  return (
                    <div
                      key={c.id}
                      className={`rounded-xl border p-3 text-xs space-y-2 transition-colors ${
                        isSelected ? 'border-[#006B2C] bg-[#F6F9F4]' : 'border-neutral bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-text">{c.title}</p>
                          <p className="text-[11px] text-textSecondary">{c.organizationName}</p>
                        </div>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                            active
                              ? 'bg-[#E8F5E9] text-[#006B2C]'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {c.organizationLocked
                            ? 'Tổ chức bị khóa'
                            : CAMPAIGN_STATUS_LABELS[c.status] || (active ? 'Đang diễn ra' : 'Đã đóng')}
                        </span>
                      </div>

                      {(c.pendingCount != null || c.handedOverCount != null) && (
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          {c.pendingCount != null && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                              {c.pendingCount} chờ lấy
                            </span>
                          )}
                          {c.handedOverCount != null && (
                            <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 font-semibold text-[#006B2C]">
                              {c.handedOverCount} đã bàn giao
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-textSecondary">
                          Hạn: {c.endTime ? date(c.endTime) : '—'}
                        </span>
                        <div className="flex items-center gap-2">
                          {c.status === 'HIDDEN' && (
                            <button
                              type="button"
                              onClick={() => openUnhideModal(c)}
                              className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                            >
                              Bỏ ẩn
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Chọn ${c.title}`}
                            onClick={() => {
                              setSelectedCampaignId(String(c.id));
                              setCampaignFilter(String(c.id));
                              setSelectedIds([]);
                              if (recordError) setRecordError(null);
                            }}
                            className="text-[11px] font-bold text-[#006B2C] hover:underline cursor-pointer"
                          >
                            Chọn chiến dịch
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {campaignTotalPages > 1 && (
              <div className="flex items-center justify-end gap-2 pt-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={campaignPage <= 0}
                  onClick={() => setCampaignPage((p) => Math.max(0, p - 1))}
                >
                  Trước
                </Button>
                <span className="text-textSecondary">
                  Trang {campaignPage + 1} / {campaignTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={campaignPage + 1 >= campaignTotalPages}
                  onClick={() => setCampaignPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            )}
          </Card>

          {/* Danh sách lượt quyên góp & Bàn giao / Tạm giữ (full-width) */}
          <div className="space-y-4">
            <Card
              title="Danh sách lượt quyên góp & Bàn giao"
              actions={
                <div className="flex items-center gap-1.5 rounded-xl bg-[#F0F5EE] p-1">
                  <button
                    type="button"
                    onClick={() => setDonationTab('LIST')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      donationTab === 'LIST'
                        ? 'bg-white text-[#006B2C] shadow-xs'
                        : 'text-[#5B6776] hover:text-text'
                    }`}
                  >
                    Danh sách & Bàn giao
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonationTab('ON_HOLD')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      donationTab === 'ON_HOLD'
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-[#5B6776] hover:text-text'
                    }`}
                  >
                    <span>Tạm giữ</span>
                    {onHoldDonations.length > 0 && (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                        {onHoldDonations.length}
                      </span>
                    )}
                  </button>
                </div>
              }
            >
              {donationTab === 'ON_HOLD' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral text-xs text-textSecondary">
                    <p>
                      Các lượt chờ lấy thuộc chiến dịch đã ẩn hoặc tổ chức bị khoá (sắp xếp tạm giữ lâu nhất lên đầu).
                    </p>
                    <span>
                      Tổng tạm giữ: <strong className="text-amber-900">{onHoldDonations.length}</strong> lượt
                    </span>
                  </div>

                  {selectedOnHoldIds.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
                      <p className="font-bold text-amber-900">
                        Đã chọn {selectedOnHoldIds.length} lượt tạm giữ để chuyển chiến dịch
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedOnHoldIds([])}>
                          Bỏ chọn
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={openReassignModal}
                          className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold"
                        >
                          Chuyển sang chiến dịch khác ({selectedOnHoldIds.length})
                        </Button>
                      </div>
                    </div>
                  )}

                  <ResourceState resource={onHoldDonationsResource} empty={!onHoldDonations.length} />

                  {onHoldDonations.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-neutral">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead>
                          <tr className="bg-background border-b border-neutral text-xs font-semibold text-textSecondary whitespace-nowrap">
                            <th className="py-2.5 px-3 w-10">
                              <input
                                type="checkbox"
                                aria-label="Chọn tất cả lượt tạm giữ"
                                checked={selectedOnHoldIds.length === onHoldDonations.length && onHoldDonations.length > 0}
                                onChange={(e) =>
                                  setSelectedOnHoldIds(
                                    e.target.checked ? onHoldDonations.map((r) => r.id) : [],
                                  )
                                }
                                className="rounded border-neutral text-[#006B2C] focus:ring-[#006B2C]"
                              />
                            </th>
                            <th className="py-2.5 px-3">Thời gian đã tạm giữ</th>
                            <th className="py-2.5 px-3">Chiến dịch cũ</th>
                            <th className="py-2.5 px-3">Lý do tạm giữ</th>
                            <th className="py-2.5 px-3">Ảnh món / hiện vật</th>
                            <th className="py-2.5 px-3">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral">
                          {onHoldDonations.map((row) => {
                            const isChecked = selectedOnHoldIds.includes(row.id);
                            const { cleanText, photos } = getDonationRowDetails(row);
                            const elapsed = formatHeldDuration(row.heldAt || row.createdAt);
                            const isFocused = focusedDonationId && String(row.id) === String(focusedDonationId);
                            return (
                              <tr
                                key={row.id}
                                className={`transition-colors hover:bg-amber-50/40 ${
                                  isFocused ? 'bg-[#EBF1E8] ring-2 ring-inset ring-primary' : ''
                                }`}
                              >
                                <td className="py-3 px-3 align-top">
                                  <input
                                    type="checkbox"
                                    aria-label={`Chọn lượt tạm giữ ${row.id}`}
                                    checked={isChecked}
                                    onChange={() => toggleOnHoldSelect(row.id)}
                                    className="rounded border-neutral text-[#006B2C] focus:ring-[#006B2C]"
                                  />
                                </td>
                                <td className="py-3 px-3 align-top whitespace-nowrap">
                                  <p className="font-semibold text-text text-[11px]">{date(row.heldAt || row.createdAt)}</p>
                                  {elapsed && <p className="text-[10px] font-bold text-amber-800">{elapsed}</p>}
                                </td>
                                <td className="py-3 px-3 align-top">
                                  <p className="font-semibold text-text">{row.campaignTitle || row.campaignId || '—'}</p>
                                  {row.organizationName && (
                                    <p className="text-[11px] text-textSecondary">{row.organizationName}</p>
                                  )}
                                </td>
                                <td className="py-3 px-3 align-top text-text">
                                  <p className="text-[11px] font-medium">{row.holdReason || 'Chiến dịch tạm ngừng tiếp nhận'}</p>
                                </td>
                                <td className="py-3 px-3 align-top space-y-1.5">
                                  {row.isConsignedItem && (
                                    <div className="flex items-start gap-2">
                                      {row.productPhotoUrl && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxState({
                                              images: [row.productPhotoUrl],
                                              index: 0,
                                              title: row.productName || row.sku || 'Món ký gửi',
                                            });
                                          }}
                                          className="w-10 h-10 rounded-lg overflow-hidden border border-neutral flex-shrink-0 cursor-zoom-in block"
                                          title="Phóng to ảnh sản phẩm"
                                        >
                                          <img
                                            src={row.productPhotoUrl}
                                            alt={row.productName || row.sku || 'Món ký gửi'}
                                            className="w-full h-full object-cover"
                                          />
                                        </button>
                                      )}
                                      <div className="space-y-0.5 min-w-0">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 whitespace-nowrap">
                                          Món ký gửi · Mã hàng hóa {row.sku || '—'}
                                        </span>
                                        {row.productName && <p className="font-semibold text-text">{row.productName}</p>}
                                      </div>
                                    </div>
                                  )}
                                  {cleanText && <p className="text-[11px] text-textSecondary">{cleanText}</p>}
                                  {photos.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                      {photos.map((src, i) => (
                                        <a
                                          key={i}
                                          href={src}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            setLightboxState({
                                              images: photos,
                                              index: i,
                                              title: 'Ảnh hiện vật quyên góp',
                                            });
                                          }}
                                          title="Xem ảnh hiện vật kích thước lớn"
                                          className="block"
                                        >
                                          <img
                                            src={src}
                                            alt={`Hiện vật ${i + 1}`}
                                            className="w-11 h-11 rounded-lg object-cover border border-[#DDE5D9]"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 align-top">
                                  <span className="inline-block rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 whitespace-nowrap">
                                    Tạm giữ
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <>
              <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-neutral">
                <select
                  aria-label="Lọc theo chiến dịch"
                  value={campaignFilter}
                  onChange={(e) => {
                    setCampaignFilter(e.target.value);
                    setSelectedIds([]);
                  }}
                  className="rounded-xl border border-neutral bg-white px-3 py-1.5 text-xs font-semibold text-text focus:border-[#006B2C] focus:outline-none"
                >
                  <option value="">Tất cả chiến dịch</option>
                  {filterCampaignOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Lọc theo trạng thái"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setSelectedIds([]);
                  }}
                  className="rounded-xl border border-neutral bg-white px-3 py-1.5 text-xs font-semibold text-text focus:border-[#006B2C] focus:outline-none"
                >
                  <option value="">Mọi trạng thái</option>
                  <option value="PENDING_PICKUP">Chờ lấy</option>
                  <option value="ON_HOLD">Tạm giữ</option>
                  <option value="HANDED_OVER">Đã bàn giao</option>
                </select>

                <span className="ml-auto text-xs text-textSecondary">
                  Tổng: <strong>{donations.length}</strong> lượt
                </span>
              </div>

              {selectedRows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#A5D6A7] bg-[#E8F5E9] p-3 text-xs">
                  <div>
                    <p className="font-bold text-[#006B2C]">
                      Đã chọn {selectedRows.length} lượt chờ lấy · {activeHandoverCampaignTitle}
                    </p>
                    <p className="text-[11px] text-[#191C19]">
                      Tổ chức tiếp nhận: <strong>{activeHandoverOrgName}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                      Bỏ chọn
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!activeHandoverOrgId || !activeHandoverCampaignId || handingOver}
                      onClick={() => {
                        setHandoverError(null);
                        setConfirmRecipient(false);
                        setConfirmItems(false);
                        setHandoverConfirmOpen(true);
                      }}
                      className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold"
                    >
                      Bàn giao cho tổ chức ({selectedRows.length})
                    </Button>
                  </div>
                </div>
              )}

              <ResourceState resource={donationsResource} empty={!donations.length} />

              {groupedDonations.length > 0 && (
                <div className="space-y-4">
                  {groupedDonations.map((group) => {
                    const pendingCount = group.rows.filter((r) => r.status === 'PENDING_PICKUP').length;
                    return (
                      <div key={group.campaignId || group.campaignTitle} className="rounded-xl border border-neutral overflow-hidden">
                        <div className="bg-[#F6F9F4] px-3.5 py-2.5 border-b border-neutral flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-text">{group.campaignTitle}</span>
                            {group.organizationName && (
                              <span className="text-textSecondary"> · {group.organizationName}</span>
                            )}
                          </div>
                          {pendingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => selectAllPendingInGroup(group)}
                              className="text-[11px] font-bold text-[#006B2C] hover:underline cursor-pointer"
                            >
                              Chọn {pendingCount} lượt chờ lấy
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[760px] text-left text-xs">
                            <thead>
                              <tr className="bg-background border-b border-neutral text-xs font-semibold text-textSecondary whitespace-nowrap">
                                <th className="py-2 px-3 w-8">Chọn</th>
                                <th className="py-2 px-3">Thời gian</th>
                                <th className="py-2 px-3">Chiến dịch / Tổ chức</th>
                                <th className="py-2 px-3">Người góp</th>
                                <th className="py-2 px-3">Ghi chú & Món ký gửi</th>
                                <th className="py-2 px-3">Moderator ghi nhận</th>
                                <th className="py-2 px-3">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral">
                              {group.rows.map((row) => {
                                const isPending = row.status === 'PENDING_PICKUP';
                                const isChecked = selectedIds.includes(row.id);
                                const campaignObj = campaignMap.get(String(row.campaignId));
                                const orgId = row.organizationId || campaignObj?.organizationId;
                                const differentGroupLocked = Boolean(
                                  activeHandoverCampaignId &&
                                    (String(row.campaignId) !== String(activeHandoverCampaignId) ||
                                      (activeHandoverOrgId && String(orgId) !== String(activeHandoverOrgId))),
                                );
                                const canSelect = isPending && Boolean(row.campaignId && orgId) && !differentGroupLocked;
                                const isFocused = focusedDonationId && String(row.id) === String(focusedDonationId);

                                return (
                                  <tr
                                    key={row.id}
                                    className={`transition-colors hover:bg-[#F6F9F4] ${
                                      isFocused ? 'bg-[#EBF1E8] ring-2 ring-inset ring-primary' : ''
                                    }`}
                                  >
                                    <td className="py-3 px-3 align-top">
                                      {isPending && (
                                        <input
                                          type="checkbox"
                                          aria-label={`Chọn lượt ${row.id}`}
                                          checked={isChecked}
                                          disabled={!canSelect}
                                          title={
                                            differentGroupLocked
                                              ? 'Chỉ bàn giao các lượt thuộc cùng 1 chiến dịch và cùng 1 tổ chức'
                                              : undefined
                                          }
                                          onChange={() => toggleSelect(row)}
                                          className="rounded border-neutral text-[#006B2C] focus:ring-[#006B2C]"
                                        />
                                      )}
                                    </td>
                                    <td className="py-3 px-3 align-top text-[11px] text-textSecondary whitespace-nowrap">
                                      {date(row.createdAt)}
                                    </td>
                                    <td className="py-3 px-3 align-top">
                                      <p className="font-semibold text-text">
                                        {row.campaignTitle || campaignObj?.title || row.campaignId || '—'}
                                      </p>
                                      <p className="text-[11px] text-textSecondary">
                                        {row.organizationName || campaignObj?.organizationName || ''}
                                      </p>
                                    </td>
                                    <td className="py-3 px-3 align-top">
                                      {row.isAnonymous ? (
                                        <span className="text-textSecondary italic">Ẩn danh</span>
                                      ) : (
                                        <span className="font-semibold text-text">{row.donorName || '—'}</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 align-top space-y-1.5 min-w-[240px]">
                                      {row.isConsignedItem && (
                                        <div className="flex items-start gap-2.5">
                                          {row.productPhotoUrl && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxState({
                                                  images: [row.productPhotoUrl],
                                                  index: 0,
                                                  title: row.productName || row.sku || 'Món ký gửi',
                                                });
                                              }}
                                              className="w-10 h-10 rounded-lg overflow-hidden border border-neutral flex-shrink-0 cursor-zoom-in block"
                                              title="Phóng to ảnh sản phẩm"
                                            >
                                              <img
                                                src={row.productPhotoUrl}
                                                alt={row.productName || row.sku || 'Món ký gửi'}
                                                className="w-full h-full object-cover"
                                              />
                                            </button>
                                          )}
                                          <div className="space-y-1 min-w-0">
                                            <div className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 whitespace-nowrap">
                                              <span>Món ký gửi · Mã hàng hóa {row.sku || '—'}</span>
                                            </div>
                                            {row.productName && (
                                              row.sku ? (
                                                <Link
                                                  to={`/moderator/inventory/${encodeURIComponent(row.sku)}`}
                                                  className="block font-semibold text-[#006B2C] hover:underline leading-snug"
                                                >
                                                  {row.productName}
                                                </Link>
                                              ) : (
                                                <p className="font-semibold text-text leading-snug">{row.productName}</p>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {/* Hiển thị ghi chú và ảnh hiện vật (ưu tiên photoUrls, fallback regex note cũ) */}
                                      {(() => {
                                        const { cleanText, photos } = getDonationRowDetails(row);
                                        const isRedundantConsignedNote =
                                          row.isConsignedItem &&
                                          typeof cleanText === 'string' &&
                                          cleanText.startsWith('Món ký gửi:');
                                        const displayNote = isRedundantConsignedNote ? '' : cleanText;

                                        return (
                                          <div className="space-y-1.5">
                                            {displayNote && <p className="font-medium text-text">{displayNote}</p>}
                                            {!displayNote && !row.isConsignedItem && photos.length === 0 && (
                                              <p className="text-textSecondary">—</p>
                                            )}
                                            {photos.length > 0 && (
                                              <div className="flex flex-wrap gap-1.5 pt-1">
                                                {photos.map((src, i) => (
                                                  <a
                                                    key={i}
                                                    href={src}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      setLightboxState({
                                                        images: photos,
                                                        index: i,
                                                        title: 'Ảnh hiện vật quyên góp',
                                                      });
                                                    }}
                                                    title="Xem ảnh hiện vật kích thước lớn"
                                                    className="block group"
                                                  >
                                                    <img
                                                      src={src}
                                                      alt={`Hiện vật ${i + 1}`}
                                                      className="w-12 h-12 rounded-lg object-cover border border-[#DDE5D9] group-hover:opacity-85 shadow-2xs"
                                                    />
                                                  </a>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="py-3 px-3 align-top text-[11px] font-mono text-textSecondary">
                                      {row.recordedBy || (row.isConsignedItem ? 'Hệ thống' : '—')}
                                    </td>
                                    <td className="py-3 px-3 align-top">
                                      {row.status === 'ON_HOLD' ? (
                                        <div className="space-y-1">
                                          <span className="inline-block rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 whitespace-nowrap">
                                            Tạm giữ
                                          </span>
                                          {row.holdReason && (
                                            <p className="text-[10px] text-amber-900 font-medium">{row.holdReason}</p>
                                          )}
                                          {row.heldAt && (
                                            <p className="text-[10px] text-textSecondary">Tạm giữ lúc: {date(row.heldAt)}</p>
                                          )}
                                        </div>
                                      ) : isPending ? (
                                        <div className="space-y-1">
                                          <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                            Chờ lấy
                                          </span>
                                          {row.reassignedFromCampaignTitle && (
                                            <p className="text-[10px] text-textSecondary">
                                              Chuyển từ chiến dịch <strong>{row.reassignedFromCampaignTitle}</strong>
                                              {row.reassignedAt ? ` (${date(row.reassignedAt)})` : ''}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-0.5">
                                          <span className="inline-block rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[10px] font-bold text-[#006B2C]">
                                            Đã bàn giao
                                          </span>
                                          {row.handedOverToOrganizationName && (
                                            <p className="text-[10px] text-textSecondary">{row.handedOverToOrganizationName}</p>
                                          )}
                                          {row.handedOverAt && (
                                            <p className="text-[10px] text-textSecondary">{date(row.handedOverAt)}</p>
                                          )}
                                          {row.reassignedFromCampaignTitle && (
                                            <p className="text-[10px] text-textSecondary">
                                              Chuyển từ chiến dịch <strong>{row.reassignedFromCampaignTitle}</strong>
                                              {row.reassignedAt ? ` (${date(row.reassignedAt)})` : ''}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      <Modal
        isOpen={recordModalOpen}
        onClose={() => !recording && setRecordModalOpen(false)}
        title="Ghi nhận lượt quyên góp (Quầy)"
        size="md"
      >
        <div className="space-y-4">
          <ResourceState resource={campaignsResource} />

          {noOpenCampaigns && (
            <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Địa điểm này hiện không có chiến dịch nào nhận đồ</p>
              <p>Theo quy định vận hành, quầy tạm thời không nhận quyên góp trực tiếp khi chưa có chiến dịch mở nhận tại đây.</p>
            </div>
          )}

          {!noOpenCampaigns && selectedCampaign && !isSelectedCampaignActive && (
            <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
              <p className="font-bold">
                {selectedCampaign.organizationLocked
                  ? 'Tổ chức của chiến dịch này đang bị khóa'
                  : `Chiến dịch ${CAMPAIGN_STATUS_LABELS[selectedCampaign.status] || 'đã đóng / hết hạn'}`}
              </p>
              <p>
                Không thể ghi nhận lượt quyên góp mới cho chiến dịch này. Bạn vẫn có thể xem lịch sử và bàn giao các lượt đang chờ lấy.
              </p>
            </div>
          )}

          {recordError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {recordError}
            </div>
          )}

          <form onSubmit={handleRecordDonation} className="space-y-3.5 text-xs">
            <div>
              <label htmlFor="donation-campaign" className="block font-bold text-text mb-1">
                Chiến dịch tiếp nhận <span className="text-red-600">*</span>
              </label>
              <select
                id="donation-campaign"
                value={effectiveCampaignId}
                disabled={noOpenCampaigns || recording}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  if (recordError) setRecordError(null);
                }}
                className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-text focus:border-[#006B2C] focus:outline-none disabled:bg-background"
              >
                {campaigns.length === 0 ? (
                  <option value="">
                    {campaignView === 'HISTORY' ? 'Không có chiến dịch trong lịch sử' : 'Không có chiến dịch đang mở'}
                  </option>
                ) : (
                  campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} — {c.organizationName}
                    </option>
                  ))
                )}
              </select>

              {selectedCampaign && (
                <div className="mt-2 rounded-xl border border-neutral bg-[#F6F9F4] p-2.5 space-y-1 text-[11px] text-textSecondary">
                  <p>
                    <span className="font-semibold text-text">Tổ chức:</span> {selectedCampaign.organizationName}
                  </p>
                  <p>
                    <span className="font-semibold text-text">Hạn nhận:</span>{' '}
                    {selectedCampaign.endTime ? date(selectedCampaign.endTime) : '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-text">Loại đồ cần:</span>{' '}
                    {selectedCampaign.preferredItemTypes?.length
                      ? selectedCampaign.preferredItemTypes.join(', ')
                      : 'Tất cả đồ phù hợp'}
                  </p>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                disabled={isRecordBlocked || recording}
                onChange={(e) => {
                  setIsAnonymous(e.target.checked);
                  if (recordError) setRecordError(null);
                }}
                className="rounded border-neutral text-[#006B2C] focus:ring-[#006B2C]"
              />
              <span className="font-semibold text-text">Người góp chọn ẩn danh</span>
            </label>

            {!isAnonymous && (
              <div>
                <label htmlFor="donation-donor-name" className="block font-bold text-text mb-1">
                  Tên người quyên góp <span className="text-red-600">*</span>
                </label>
                <input
                  id="donation-donor-name"
                  type="text"
                  value={donorName}
                  disabled={isRecordBlocked || recording}
                  onChange={(e) => {
                    setDonorName(e.target.value);
                    if (recordError) setRecordError(null);
                  }}
                  placeholder="VD: Nguyễn Minh Anh"
                  className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-text focus:border-[#006B2C] focus:outline-none"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="donation-note" className="block font-bold text-text">
                  Ghi chú gộp hiện vật
                </label>
              </div>

              {selectedCampaign?.preferredItemTypes?.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-[#5B6776] mb-1 font-medium">
                    Gợi ý loại hiện vật chiến dịch cần (bấm để thêm vào ghi chú):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCampaign.preferredItemTypes.map((itemType) => (
                      <button
                        key={itemType}
                        type="button"
                        disabled={isRecordBlocked || recording}
                        onClick={() => {
                          setNote((prev) => {
                            const trimmed = prev.trim();
                            if (!trimmed) return itemType;
                            if (trimmed.includes(itemType)) return prev;
                            return `${trimmed}, ${itemType}`;
                          });
                          if (recordError) setRecordError(null);
                        }}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#006B2C] border border-[#006B2C]/20 hover:bg-[#D0EBD2] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        + {itemType}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                id="donation-note"
                rows={3}
                value={note}
                disabled={isRecordBlocked || recording}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (recordError) setRecordError(null);
                }}
                placeholder='VD: "5 áo khoác, 2 chăn"'
                className="w-full rounded-xl border border-neutral bg-white p-2.5 text-xs text-text focus:border-[#006B2C] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-text mb-1">
                Ảnh gói hiện vật quyên góp (tuỳ chọn)
              </label>
              <p className="text-[10px] text-[#5B6776] mb-1.5">
                Chụp hoặc tải ảnh gói đồ quyên góp tại quầy để lưu chứng từ đối soát (tối đa 5 ảnh).
              </p>
              <PhotoUpload maxFiles={5} disabled={isRecordBlocked || recording} onChange={onDonationPhotosChange} />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={recording}
                onClick={() => setRecordModalOpen(false)}
                className="whitespace-nowrap"
              >
                Đóng
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={recording || donationPhotosPending}
                disabled={isRecordBlocked || !effectiveCampaignId || (!isAnonymous && !donorName.trim()) || donationPhotosPending}
                className="py-2.5 px-5 text-xs font-bold bg-[#006B2C] hover:bg-[#005523] text-white whitespace-nowrap"
              >
                Ghi nhận lượt quyên góp
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={reassignModalOpen}
        onClose={() => !reassigning && setReassignModalOpen(false)}
        title="Chuyển lượt quyên góp sang chiến dịch khác"
        size="md"
      >
        <div className="space-y-4 text-xs text-textSecondary">
          <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3">
            <p>
              Số lượt đang chọn: <strong className="text-text">{selectedOnHoldIds.length} lượt tạm giữ</strong>
            </p>
            <p className="text-[11px] mt-1">
              Chỉ hiển thị chiến dịch đang mở, chưa hết hạn và nhận đồ tại điểm ký gửi này.
            </p>
          </div>

          {activeCampaignsForReassignResource.loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-textSecondary text-xs">
              <Spinner size="sm" />
              <span>Đang tải danh sách chiến dịch phù hợp…</span>
            </div>
          ) : reassignCampaignOptions.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900 font-medium">
              Chưa có chiến dịch nào phù hợp đang nhận đồ tại điểm ký gửi này — các lượt đã chọn vẫn được tạm giữ.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {reassignCampaignOptions.map((c) => {
                const selectedVal = reassignCampaignId || String(reassignCampaignOptions[0]?.id || '');
                const isSelected = String(c.id) === String(selectedVal);
                return (
                  <label
                    key={c.id}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-[#006B2C] bg-[#E8F5E9]/60' : 'border-neutral bg-white hover:bg-[#F6F9F4]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reassignCampaign"
                      value={c.id}
                      checked={isSelected}
                      onChange={() => setReassignCampaignId(String(c.id))}
                      className="mt-0.5 text-[#006B2C] focus:ring-[#006B2C]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-text">{c.title}</p>
                      <p className="text-[11px] text-textSecondary">
                        {c.organizationName}
                        {c.endTime ? ` · Hạn: ${date(c.endTime)}` : ''}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {reassignError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {reassignError}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" disabled={reassigning} onClick={() => setReassignModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              loading={reassigning}
              disabled={reassigning || activeCampaignsForReassignResource.loading || reassignCampaignOptions.length === 0}
              onClick={handleConfirmReassign}
              className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold"
            >
              Xác nhận chuyển ({selectedOnHoldIds.length})
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={handoverConfirmOpen}
        onClose={() => !handingOver && setHandoverConfirmOpen(false)}
        title="Xác nhận bàn giao đồ quyên góp cho tổ chức"
        size="md"
      >
        <div className="space-y-4 text-xs text-textSecondary">
          <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3.5 space-y-1.5">
            <p>Tổ chức nhận: <strong className="text-[#006B2C]">{activeHandoverOrgName}</strong></p>
            <p>Chiến dịch: <strong className="text-text">{activeHandoverCampaignTitle}</strong></p>
            <p>Tổng số lượt: <strong className="text-text">{selectedRows.length} lượt</strong></p>
          </div>

          <div className="space-y-1.5">
            <p className="font-bold text-text">Danh sách ghi chú &amp; Mã hàng hóa cần bàn giao:</p>
            <ul className="max-h-48 overflow-y-auto rounded-xl border border-neutral bg-white divide-y divide-neutral">
              {selectedRows.map((row) => (
                <li key={row.id} className="p-2.5 flex items-start justify-between gap-3">
                  <span className="text-text font-medium">{getDonationRowDetails(row).cleanText || row.productName || 'Không có ghi chú'}</span>
                  {row.sku && (
                    <span className="font-mono font-bold text-[11px] text-[#006B2C] bg-[#E8F5E9] px-2 py-0.5 rounded flex-shrink-0">
                      {row.sku}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {handoverError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {handoverError}
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-neutral bg-[#F6F9F4] p-3">
            <label className="flex items-start gap-2 cursor-pointer select-none text-text">
              <input
                type="checkbox"
                checked={confirmRecipient}
                disabled={handingOver}
                onChange={(e) => setConfirmRecipient(e.target.checked)}
                className="mt-0.5 rounded border-neutral text-[#006B2C] focus:ring-[#006B2C]"
              />
              <span>
                <strong>Đúng người nhận:</strong> Xác nhận đúng tổ chức / đại diện nhận bàn giao ({activeHandoverOrgName})
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer select-none text-text">
              <input
                type="checkbox"
                checked={confirmItems}
                disabled={handingOver}
                onChange={(e) => setConfirmItems(e.target.checked)}
                className="mt-0.5 rounded border-neutral text-[#006B2C] focus:ring-[#006B2C]"
              />
              <span>
                <strong>Đủ số lượng / đúng đồ bàn giao:</strong> Xác nhận đã kiểm đếm đủ {selectedRows.length} lượt quyên góp nêu trên
              </span>
            </label>
          </div>

          <p>Sau khi xác nhận bàn giao, trạng thái không thể hoàn tác.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" disabled={handingOver} onClick={() => setHandoverConfirmOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={handingOver}
              disabled={!confirmRecipient || !confirmItems || handingOver}
              onClick={handleConfirmHandover}
              className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold"
            >
              Xác nhận bàn giao
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Bỏ ẩn chiến dịch */}
      <Modal
        isOpen={Boolean(unhideTarget)}
        onClose={() => { if (!unhiding) setUnhideTarget(null); }}
        title="Bỏ ẩn chiến dịch"
        size="sm"
      >
        <div className="space-y-4 text-xs">
          {unhideTarget && (
            <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3 space-y-1">
              <p className="font-bold text-text">{unhideTarget.title}</p>
              <p className="text-textSecondary">{unhideTarget.organizationName}</p>
            </div>
          )}

          <div>
            <label htmlFor="unhide-campaign-reason" className="block font-bold text-text mb-1">
              Lý do bỏ ẩn <span className="text-red-600">*</span>
            </label>
            <textarea
              id="unhide-campaign-reason"
              rows={3}
              value={unhideReason}
              disabled={unhiding}
              onChange={(e) => {
                setUnhideReason(e.target.value);
                if (unhideError) setUnhideError(null);
              }}
              placeholder="Nhập lý do bỏ ẩn chiến dịch (bắt buộc)..."
              className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-text focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          {unhideError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {unhideError}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" disabled={unhiding} onClick={() => setUnhideTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={unhiding}
              disabled={unhiding || !unhideReason.trim()}
              onClick={handleConfirmUnhide}
              className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold"
            >
              Xác nhận bỏ ẩn
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox Xem & phóng to ảnh quyên góp */}
      {lightboxState && (
        <ImageLightbox
          isOpen={Boolean(lightboxState)}
          onClose={() => setLightboxState(null)}
          images={(lightboxState?.images || []).map((item) =>
            typeof item === 'string'
              ? { src: item, alt: 'Ảnh hiện vật quyên góp kích thước lớn' }
              : item
          )}
          initialIndex={lightboxState?.index ?? 0}
          categoryLabel={lightboxState?.title || 'Ảnh hiện vật quyên góp'}
        />
      )}
    </Page>
  );
}

