import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { donationService } from '../services/donationApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { Page, Card, ResourceState, date } from '../components/WarehouseUi.jsx';

export default function DonationsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedDonationId = searchParams.get('donationId') || '';
  const initialCampaignFilter = searchParams.get('campaignId') || '';

  const [campaignFilter, setCampaignFilter] = useState(initialCampaignFilter);
  const [statusFilter, setStatusFilter] = useState('');

  // Form ghi nhận lượt quyên góp trực tiếp (Luồng A)
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [note, setNote] = useState('');

  // Chọn các lượt chờ lấy để bàn giao cho tổ chức (F-165)
  const [selectedIds, setSelectedIds] = useState([]);
  const [handoverConfirmOpen, setHandoverConfirmOpen] = useState(false);

  const warehouses = useResource((options) => donationService.myWarehouses(options), []);
  const warehouse = Array.isArray(warehouses.data) ? warehouses.data[0] : null;
  const warehouseId = warehouse?.id || null;

  const campaignsResource = useResource(
    (options) => (warehouseId ? donationService.warehouseCampaigns(warehouseId, options) : Promise.resolve([])),
    [warehouseId],
    { enabled: Boolean(warehouseId) },
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
    { enabled: Boolean(warehouseId) },
  );

  const campaigns = useMemo(
    () => (Array.isArray(campaignsResource.data) ? campaignsResource.data : []),
    [campaignsResource.data],
  );
  const donations = useMemo(
    () => (Array.isArray(donationsResource.data) ? donationsResource.data : []),
    [donationsResource.data],
  );

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
  const noOpenCampaigns = Boolean(warehouseId) && !campaignsResource.loading && !campaignsResource.error && campaigns.length === 0;

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
    setSelectedIds((prev) =>
      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id],
    );
  };

  const handleRecordDonation = async (event) => {
    event.preventDefault();
    if (!warehouseId || noOpenCampaigns) return;
    await donationsResource.mutate(
      (options) =>
        donationService.recordDonation(
          warehouseId,
          { campaignId: effectiveCampaignId, donorName, isAnonymous, note },
          options,
        ),
      {
        onSuccess: () => {
          toast.success('Đã ghi nhận lượt quyên góp. Tổ chức sẽ nhận thông báo đến lấy.');
          setDonorName('');
          setIsAnonymous(false);
          setNote('');
        },
      },
    );
  };

  const handleConfirmHandover = async () => {
    if (!warehouseId || !selectedRows.length || !activeHandoverCampaignId || !activeHandoverOrgId) return;
    await donationsResource.mutate(
      (options) =>
        donationService.handoverDonations(
          warehouseId,
          {
            donationIds: selectedRows.map((r) => r.id),
            organizationId: activeHandoverOrgId,
            campaignId: activeHandoverCampaignId,
          },
          options,
        ),
      {
        onSuccess: (res) => {
          const count = res?.handedOverCount ?? selectedRows.length;
          toast.success(`Đã bàn giao ${count} lượt quyên góp cho ${activeHandoverOrgName}.`);
          setSelectedIds([]);
          setHandoverConfirmOpen(false);
          if (focusedDonationId) {
            const next = new URLSearchParams(searchParams);
            next.delete('donationId');
            setSearchParams(next, { replace: true });
          }
        },
      },
    );
  };

  return (
    <Page
      title="Quyên góp & Bàn giao tổ chức"
      subtitle={warehouse?.name ? `Điểm ký gửi: ${warehouse.name}` : 'Ghi nhận lượt quyên góp trực tiếp và bàn giao cho tổ chức từ thiện'}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            campaignsResource.refresh();
            donationsResource.refresh();
          }}
        >
          Tải lại
        </Button>
      }
    >
      <ResourceState resource={warehouses} />

      {warehouseId && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* CỘT TRÁI: Ghi nhận lượt quyên góp trực tiếp (Luồng A) */}
          <div className="lg:col-span-4 space-y-4">
            <Card title="Ghi nhận lượt quyên góp (Quầy)">
              <ResourceState resource={campaignsResource} />

              {noOpenCampaigns && (
                <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Chưa có chiến dịch đang nhận đồ tại điểm ký gửi này</p>
                  <p>Theo quy định vận hành, quầy tạm thời không nhận quyên góp trực tiếp khi chưa có chiến dịch mở nhận tại đây.</p>
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
                    disabled={noOpenCampaigns || donationsResource.busy}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-text focus:border-[#006B2C] focus:outline-none disabled:bg-background"
                  >
                    {campaigns.length === 0 ? (
                      <option value="">Không có chiến dịch đang mở</option>
                    ) : (
                      campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} — {c.organizationName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    disabled={noOpenCampaigns || donationsResource.busy}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
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
                      disabled={noOpenCampaigns || donationsResource.busy}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="VD: Nguyễn Minh Anh"
                      className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-text focus:border-[#006B2C] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="donation-note" className="block font-bold text-text mb-1">
                    Ghi chú gộp hiện vật
                  </label>
                  <textarea
                    id="donation-note"
                    rows={3}
                    value={note}
                    disabled={noOpenCampaigns || donationsResource.busy}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder='VD: "5 áo, 2 chăn"'
                    className="w-full rounded-xl border border-neutral bg-white p-2.5 text-xs text-text focus:border-[#006B2C] focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={donationsResource.busy}
                  disabled={noOpenCampaigns || !effectiveCampaignId || (!isAnonymous && !donorName.trim())}
                  className="w-full py-2.5 text-xs font-bold bg-[#006B2C] hover:bg-[#005523] text-white"
                >
                  Ghi nhận lượt quyên góp
                </Button>
              </form>
            </Card>
          </div>

          {/* CỘT PHẢI: Danh sách lượt quyên góp & Bàn giao cho tổ chức */}
          <div className="lg:col-span-8 space-y-4">
            <Card title="Danh sách lượt quyên góp & Bàn giao">
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
                  <option value="PENDING_PICKUP">Chờ tổ chức lấy (PENDING_PICKUP)</option>
                  <option value="HANDED_OVER">Đã bàn giao (HANDED_OVER)</option>
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
                      disabled={!activeHandoverOrgId || !activeHandoverCampaignId || donationsResource.busy}
                      onClick={() => setHandoverConfirmOpen(true)}
                      className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold"
                    >
                      Bàn giao cho tổ chức ({selectedRows.length})
                    </Button>
                  </div>
                </div>
              )}

              <ResourceState resource={donationsResource} empty={!donations.length} />

              {donations.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead>
                      <tr className="bg-background border-b border-neutral text-[10px] uppercase font-bold tracking-wider text-textSecondary">
                        <th className="py-2.5 px-3 w-8">Chọn</th>
                        <th className="py-2.5 px-3">Nguồn / Ghi chú</th>
                        <th className="py-2.5 px-3">Chiến dịch & Tổ chức</th>
                        <th className="py-2.5 px-3">Người góp</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral">
                      {donations.map((row) => {
                        const isPending = row.status === 'PENDING_PICKUP';
                        const isChecked = selectedIds.includes(row.id);
                        const campaignObj = campaignMap.get(String(row.campaignId));
                        const orgId = row.organizationId || campaignObj?.organizationId;
                        const differentCampaignLocked = Boolean(
                          activeHandoverCampaignId && String(row.campaignId) !== String(activeHandoverCampaignId),
                        );
                        const canSelect = isPending && Boolean(row.campaignId && orgId) && !differentCampaignLocked;
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
                                  title={differentCampaignLocked ? 'Chỉ bàn giao các lượt thuộc cùng 1 chiến dịch' : undefined}
                                  onChange={() => toggleSelect(row)}
                                  className="rounded border-neutral text-[#006B2C] focus:ring-[#006B2C]"
                                />
                              )}
                            </td>
                            <td className="py-3 px-3 align-top space-y-1">
                              {row.isConsignedItem && (
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                                  <span>Món ký gửi · SKU {row.sku || '—'}</span>
                                  {row.sku && (
                                    <Link
                                      to={`/moderator/inventory/${encodeURIComponent(row.sku)}`}
                                      className="underline text-[#006B2C]"
                                    >
                                      Xem
                                    </Link>
                                  )}
                                </div>
                              )}
                              <p className="font-medium text-text">{row.note || '—'}</p>
                              <p className="text-[11px] text-textSecondary">Ghi nhận: {date(row.createdAt)}</p>
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
                            <td className="py-3 px-3 align-top">
                              {isPending ? (
                                <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  Chờ lấy
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-block rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[10px] font-bold text-[#006B2C]">
                                    Đã bàn giao
                                  </span>
                                  {row.handedOverAt && (
                                    <p className="text-[10px] text-textSecondary">{date(row.handedOverAt)}</p>
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
              )}
            </Card>
          </div>
        </div>
      )}

      <Modal
        isOpen={handoverConfirmOpen}
        onClose={() => !donationsResource.busy && setHandoverConfirmOpen(false)}
        title="Xác nhận bàn giao đồ quyên góp cho tổ chức"
        size="sm"
      >
        <div className="space-y-4 text-xs text-textSecondary">
          <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3.5 space-y-1.5">
            <p>Số lượt bàn giao: <strong className="text-text">{selectedRows.length} lượt</strong></p>
            <p>Chiến dịch: <strong className="text-text">{activeHandoverCampaignTitle}</strong></p>
            <p>Tổ chức nhận: <strong className="text-[#006B2C]">{activeHandoverOrgName}</strong></p>
          </div>
          <p>Xác nhận đại diện tổ chức đã đến kho nhận đủ số đồ quyên góp trên? Sau khi xác nhận không thể hoàn tác.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" disabled={donationsResource.busy} onClick={() => setHandoverConfirmOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={donationsResource.busy}
              onClick={handleConfirmHandover}
              className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold"
            >
              Xác nhận bàn giao
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

