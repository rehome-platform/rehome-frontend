import React, { useState, useMemo } from 'react';
import { Modal, Button } from '../../../../components/common/index.js';

export function ExistingOrganizationsSection({
  loading,
  existingOrgs = [],
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Danh sách loại hình tổ chức duy nhất để đưa vào dropdown lọc
  const orgTypes = useMemo(() => {
    const set = new Set();
    existingOrgs.forEach((o) => {
      const t = o.orgType || o.type;
      if (t) set.add(t);
    });
    return Array.from(set);
  }, [existingOrgs]);

  // Lọc theo từ khóa tìm kiếm và loại hình
  const filteredOrgs = useMemo(() => {
    return existingOrgs.filter((org) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (org.displayName || '').toLowerCase().includes(q) ||
        (org.legalName || '').toLowerCase().includes(q) ||
        (org.name || '').toLowerCase().includes(q) ||
        (org.taxCode || '').toLowerCase().includes(q) ||
        (org.representative || '').toLowerCase().includes(q) ||
        (org.operationScope || '').toLowerCase().includes(q) ||
        (org.donationPointAddress || '').toLowerCase().includes(q) ||
        (org.id || '').toLowerCase().includes(q);

      const orgType = org.orgType || org.type;
      const matchType = typeFilter === 'ALL' || orgType === typeFilter;

      return matchSearch && matchType;
    });
  }, [existingOrgs, searchTerm, typeFilter]);

  return (
    <div className="space-y-4">
      {/* Thanh tìm kiếm & bộ lọc */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-neutral">
        <div className="flex-1 flex items-center gap-2 bg-background px-3 py-2 rounded-xl border border-neutral">
          <span className="material-symbols-outlined text-textSecondary text-lg">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên tổ chức, MST, người đại diện, địa bàn..."
            className="w-full bg-transparent text-xs text-text placeholder-textSecondary focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-textSecondary hover:text-text text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-background text-text px-3 py-2 rounded-xl border border-neutral focus:outline-none font-medium cursor-pointer"
          >
            <option value="ALL">Tất cả loại hình ({existingOrgs.length})</option>
            {orgTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-xs shrink-0 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Làm mới</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bảng danh sách tổ chức */}
      <div className="bg-surface border border-neutral rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-background border-b border-neutral text-[11px] uppercase font-bold text-textSecondary tracking-wider">
                <th className="py-3 px-3.5">Tổ chức</th>
                <th className="py-3 px-3">Loại hình & MST</th>
                <th className="py-3 px-3">Phạm vi</th>
                <th className="py-3 px-3">Điểm nhận quyên góp</th>
                <th className="py-3 px-3">Ngày xác minh</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral">
              {loading && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-textSecondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Đang tải danh sách tổ chức hiện hữu...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filteredOrgs.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-textSecondary">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-3xl text-neutral">domain_disabled</span>
                      <p className="font-semibold text-text text-sm mt-1">Không tìm thấy tổ chức nào</p>
                      <p className="text-xs text-textSecondary">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn bộ lọc loại hình.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredOrgs.map((org) => {
                  const orgName = org.displayName || org.name || org.legalName || org.id;
                  const legalName = org.legalName && org.legalName !== orgName ? org.legalName : null;
                  const orgType = org.orgType || org.type || 'Tổ chức từ thiện';
                  const initials = orgName
                    .split(' ')
                    .filter(Boolean)
                    .slice(-2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();

                  const verifiedDateStr = org.verifiedAt
                    ? new Date(org.verifiedAt).toLocaleDateString('vi-VN')
                    : org.createdAt
                    ? new Date(org.createdAt).toLocaleDateString('vi-VN')
                    : '—';

                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-background/60 transition-colors"
                    >
                      {/* Cột 1: Logo & Tên */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          {org.logoUrl ? (
                            <img
                              src={org.logoUrl}
                              alt={orgName}
                              className="w-9 h-9 rounded-xl object-cover border border-neutral shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                              {initials || 'TC'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-text block truncate max-w-[200px]" title={orgName}>
                              {orgName}
                            </span>
                            {legalName && (
                              <span
                                className="text-[11px] text-textSecondary block truncate max-w-[200px]"
                                title={legalName}
                              >
                                {legalName}
                              </span>
                            )}
                            <span className="text-[10px] text-textSecondary/80 font-mono">
                              ID: {org.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Loại hình & MST */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                            {orgType}
                          </span>
                          <div className="text-[11px] font-mono text-textSecondary">
                            MST: {org.taxCode && org.taxCode !== 'không có' ? (
                              <span className="font-semibold text-text">{org.taxCode}</span>
                            ) : (
                              'Không có'
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Phạm vi */}
                      <td className="py-3 px-3">
                        <span className="text-text font-medium block">
                          {org.operationScope || org.scope || 'Toàn quốc'}
                        </span>
                      </td>

                      {/* Cột 4: Điểm tiếp nhận quyên góp */}
                      <td className="py-3 px-3 max-w-[220px]">
                        {org.donationPointAddress || org.donationPointName ? (
                          <div className="space-y-0.5">
                            {org.donationPointName && (
                              <span className="font-semibold text-text text-[11px] block truncate">
                                {org.donationPointName}
                              </span>
                            )}
                            <span
                              className="text-[11px] text-textSecondary block truncate"
                              title={org.donationPointAddress}
                            >
                              {org.donationPointAddress}
                            </span>
                            {org.donationPointReceivingHours && (
                              <span className="text-[10px] text-textSecondary/80 block">
                                🕒 {org.donationPointReceivingHours}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-textSecondary text-[11px]">Chưa thiết lập</span>
                        )}
                      </td>

                      {/* Cột 5: Ngày xác minh */}
                      <td className="py-3 px-3 text-textSecondary font-mono">
                        {verifiedDateStr}
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#006B2C]" />
                          Đang hoạt động
                        </span>
                      </td>

                      {/* Cột 7: Nút Xem chi tiết */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrg(org)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface hover:bg-background border border-neutral text-text transition-colors shadow-sm inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm text-primary">visibility</span>
                          <span>Xem hồ sơ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal xem chi tiết hồ sơ tổ chức hiện hữu */}
      {selectedOrg && (
        <Modal
          isOpen={!!selectedOrg}
          onClose={() => setSelectedOrg(null)}
          title="Chi tiết hồ sơ tổ chức hiện hữu"
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Header tóm tắt */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-surface border border-neutral">
              {selectedOrg.logoUrl ? (
                <img
                  src={selectedOrg.logoUrl}
                  alt={selectedOrg.displayName}
                  className="w-14 h-14 rounded-2xl object-cover border border-neutral shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center shrink-0 border border-primary/20">
                  {(selectedOrg.displayName || 'TC').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-text">
                    {selectedOrg.displayName || selectedOrg.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                    ✓ Đã xác thực
                  </span>
                </div>
                {selectedOrg.legalName && selectedOrg.legalName !== selectedOrg.displayName && (
                  <p className="text-textSecondary text-xs">
                    Tên pháp lý: <strong className="text-text">{selectedOrg.legalName}</strong>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-textSecondary pt-1">
                  <span>Mã tổ chức: <strong className="font-mono text-text">{selectedOrg.id}</strong></span>
                  <span>•</span>
                  <span>Loại hình: <strong className="text-primary">{selectedOrg.orgType || selectedOrg.type || 'Tổ chức từ thiện'}</strong></span>
                  {selectedOrg.followerCount != null && (
                    <>
                      <span>•</span>
                      <span>Người theo dõi: <strong className="text-text">{selectedOrg.followerCount}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Khối thông tin chi tiết */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Box 1: Thông tin pháp lý */}
              <div className="p-4 rounded-2xl bg-background border border-neutral space-y-2.5">
                <h4 className="font-bold text-text uppercase tracking-wider text-[11px] border-b border-neutral pb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">verified_user</span>
                  Thông tin pháp lý
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Mã số thuế:</span>
                    <span className="font-mono font-semibold text-text">
                      {selectedOrg.taxCode && selectedOrg.taxCode !== 'không có' ? selectedOrg.taxCode : 'Không có'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Phạm vi hoạt động:</span>
                    <span className="font-semibold text-text">
                      {selectedOrg.operationScope || selectedOrg.scope || 'Toàn quốc'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Ngày xác minh:</span>
                    <span className="font-mono text-text">
                      {selectedOrg.verifiedAt ? new Date(selectedOrg.verifiedAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Người đại diện & Liên hệ */}
              <div className="p-4 rounded-2xl bg-background border border-neutral space-y-2.5">
                <h4 className="font-bold text-text uppercase tracking-wider text-[11px] border-b border-neutral pb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">person</span>
                  Người đại diện & Liên hệ
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Người đại diện:</span>
                    <span className="font-semibold text-text">
                      {selectedOrg.representative || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Hotline / SĐT:</span>
                    <span className="font-mono text-text">
                      {selectedOrg.phone || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Email:</span>
                    <span className="text-text font-medium truncate max-w-[180px]">
                      {selectedOrg.email || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Điểm tiếp nhận đồ quyên góp */}
            <div className="p-4 rounded-2xl bg-background border border-neutral space-y-2.5">
              <h4 className="font-bold text-text uppercase tracking-wider text-[11px] border-b border-neutral pb-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                Điểm tiếp nhận đồ quyên góp trực tiếp
              </h4>
              <div className="space-y-1.5">
                {selectedOrg.donationPointName && (
                  <p className="font-semibold text-text text-sm">
                    {selectedOrg.donationPointName}
                  </p>
                )}
                <p className="text-textSecondary">
                  {selectedOrg.donationPointAddress || selectedOrg.address || 'Chưa cập nhật địa chỉ tiếp nhận đồ quyên góp.'}
                </p>
                {selectedOrg.donationPointReceivingHours && (
                  <p className="text-text font-medium text-[11px] pt-1">
                    🕒 Thời gian tiếp nhận: <strong>{selectedOrg.donationPointReceivingHours}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Box 4: Giới thiệu tổ chức */}
            {selectedOrg.description && (
              <div className="p-4 rounded-2xl bg-surface border border-neutral space-y-1.5">
                <h4 className="font-bold text-text uppercase tracking-wider text-[11px]">
                  Mô tả & Tôn chỉ hoạt động
                </h4>
                <p className="text-textSecondary leading-relaxed whitespace-pre-line text-xs">
                  {selectedOrg.description}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedOrg(null)}
                className="text-xs"
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ExistingOrganizationsSection;

