import React, { useEffect } from 'react';
import Logo from '../../../components/common/Logo.jsx';
import {
  APK_DOWNLOAD_URL,
  APP_METADATA,
  ECOSYSTEM_ROLES,
  FOOTER_CONTACT,
  INFO_MODAL_TABS,
  INSPECTION_CHECKLIST,
  INSPECTION_GRADES,
  INSTALL_STEPS,
} from '../constants/landingConstants.js';
import {
  AndroidIcon,
  CheckCircleIcon,
  CloseIcon,
  DownloadIcon,
  FileTextIcon,
  InfoIcon,
  LayersIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
} from './LandingIcons.jsx';

const TAB_ICONS = {
  about: InfoIcon,
  inspection: ShieldCheckIcon,
  consignment: LayersIcon,
  install: AndroidIcon,
  policy: LockIcon,
};

export default function ReHomeInfoModal({
  isOpen,
  activeTab = 'about',
  onSelectTab,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rehome-info-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] rounded-3xl bg-[#F6F9F4] border border-[#DDE5D9] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Emerald tối đồng bộ thương hiệu */}
        <div className="bg-[#041E12] text-white px-5 sm:px-6 pt-5 pb-4 space-y-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                <Logo size="sm" showText={false} to={null} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="rehome-info-modal-title"
                    className="text-base sm:text-lg font-extrabold tracking-tight text-white"
                  >
                    Trung tâm Thông tin &amp; Minh bạch ReHome
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-[#FEA619] text-[#1F2A37] text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                    VERIFIED
                  </span>
                </div>
                <p className="text-xs text-white/75 mt-0.5">
                  Quy trình kiểm định tại kho, quy chế ký gửi 90%, cài đặt APK &amp; chính sách bảo vệ
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Đóng trung tâm thông tin"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Thanh Tab ngang */}
          <div
            role="tablist"
            aria-label="Danh mục thông tin ReHome"
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-1 landing-rail-scroll"
          >
            {INFO_MODAL_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.id] || FileTextIcon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectTab?.(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#006B2C] text-white shadow-sm ring-1 ring-[#34D399]/40'
                      : 'bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nội dung cuộn theo từng Tab */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-[#1F2A37]">
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-[#006B2C]/25 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center shrink-0">
                  <InfoIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#1F2A37]">
                    Hệ sinh thái Thời trang Tuần hoàn – AI – Thiện nguyện
                  </h3>
                  <p className="text-xs text-[#5B6776] mt-1 leading-relaxed">
                    ReHome kết nối người có tủ đồ thừa, người săn đồ hiệu kiểm định và các tổ chức
                    thiện nguyện xác minh pháp lý trong một ứng dụng Android duy nhất.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {ECOSYSTEM_ROLES.map((item) => (
                  <div
                    key={item.role}
                    className="rounded-2xl bg-white border border-[#DDE5D9] p-4 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#1F2A37]">{item.role}</span>
                      <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                    </div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#006B2C] text-[10px] font-bold whitespace-nowrap">
                      {item.highlight}
                    </span>
                    <p className="text-xs text-[#5B6776] leading-relaxed">{item.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'inspection' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-[#006B2C]/25 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center shrink-0">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#1F2A37]">
                    Quy trình kiểm định 6 tiêu chí tại quầy ReHome
                  </h3>
                  <p className="text-xs text-[#5B6776] mt-0.5">
                    Thương lượng giá công khai tại quầy — khách không đồng ý có thể mang đồ về ngay.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {INSPECTION_CHECKLIST.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-xl bg-white border border-[#DDE5D9] px-3.5 py-2.5 flex items-center gap-2.5 text-xs font-semibold"
                  >
                    <span className="w-6 h-6 rounded-lg bg-[#006B2C] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#5B6776]">
                  Phân hạng tình trạng 4 cấp minh bạch
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {INSPECTION_GRADES.map((grade) => (
                    <div
                      key={grade.label}
                      className="rounded-2xl bg-white border border-[#DDE5D9] p-3.5 space-y-1"
                    >
                      <p className="text-xs font-extrabold text-[#006B2C]">{grade.label}</p>
                      <p className="text-xs text-[#5B6776] leading-snug">{grade.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'consignment' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#062B19] text-white p-4 space-y-1">
                  <p className="text-[11px] font-bold uppercase text-[#A7F3D0]">Doanh thu kỳ đầu</p>
                  <p className="text-2xl font-extrabold text-[#FEA619]">90%</p>
                  <p className="text-xs text-white/80">Chuyển trực tiếp về Ví ReHome sau khi bán.</p>
                </div>
                <div className="rounded-2xl bg-white border border-[#DDE5D9] p-4 space-y-1">
                  <p className="text-[11px] font-bold uppercase text-[#5B6776]">Phí dịch vụ kho</p>
                  <p className="text-2xl font-extrabold text-[#006B2C]">10%</p>
                  <p className="text-xs text-[#5B6776]">Trọn gói kiểm định, chụp ảnh, gắn AI &amp; bán hộ.</p>
                </div>
                <div className="rounded-2xl bg-white border border-[#DDE5D9] p-4 space-y-1">
                  <p className="text-[11px] font-bold uppercase text-[#5B6776]">Chu kỳ ký gửi</p>
                  <p className="text-2xl font-extrabold text-[#1F2A37]">30 ngày</p>
                  <p className="text-xs text-[#5B6776]">Gia hạn tối đa 2 lần hoặc nhận lại miễn phí.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-[#DDE5D9] p-4 space-y-2.5">
                <h3 className="text-sm font-extrabold text-[#1F2A37]">
                  3 lựa chọn khi hết chu kỳ 30 ngày chưa bán
                </h3>
                <ul className="space-y-2 text-xs text-[#5B6776]">
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#1F2A37]">Gia hạn bán tiếp:</strong> tối đa 2 chu kỳ
                      ngay trên ứng dụng ReHome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#1F2A37]">Nhận lại đồ miễn phí:</strong> trong vòng 7
                      ngày tại điểm kho đã ký gửi.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#1F2A37]">Chuyển thiện nguyện 1 chạm:</strong> gửi thẳng
                      tới chiến dịch đã xác minh pháp lý.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {INSTALL_STEPS.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-2xl bg-white border border-[#DDE5D9] p-4 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-[#006B2C] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        {item.step}
                      </span>
                      <p className="text-xs font-extrabold text-[#1F2A37]">{item.title}</p>
                    </div>
                    <p className="text-xs text-[#5B6776] leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-[#E8F5E9] border border-[#006B2C]/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-[#1F2A37] leading-relaxed">
                  <strong>Lưu ý Play Protect:</strong> Nếu thiết bị hỏi xác nhận nguồn ngoài, chọn{' '}
                  <strong>Vẫn cài đặt (Install anyway)</strong> cho bản ReHome v{APP_METADATA.version}.
                </p>
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#006B2C] hover:bg-[#005523] text-white text-xs font-bold whitespace-nowrap shrink-0"
                >
                  <DownloadIcon className="w-4 h-4 shrink-0" />
                  <span>Tải APK Google Drive</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-white border border-[#DDE5D9] p-4 space-y-1">
                <h3 className="text-sm font-extrabold text-[#006B2C]">
                  1. Chính sách kiểm hàng &amp; đổi trả 3 ngày
                </h3>
                <p className="text-xs text-[#5B6776] leading-relaxed">
                  Mọi sản phẩm trên sàn đều đã được dán tem SKU kiểm định tại kho. Người mua được hỗ
                  trợ khiếu nại và hoàn trả minh bạch trong vòng 3 ngày nếu sản phẩm sai mô tả phân hạng.
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-[#DDE5D9] p-4 space-y-1">
                <h3 className="text-sm font-extrabold text-[#006B2C]">
                  2. Thẩm định tổ chức thiện nguyện 100%
                </h3>
                <p className="text-xs text-[#5B6776] leading-relaxed">
                  Chỉ các tổ chức hoàn tất xác minh giấy tờ pháp lý mới được mở chiến dịch tiếp nhận
                  quyên góp công khai tại điểm kho ReHome.
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-[#DDE5D9] p-4 space-y-1">
                <h3 className="text-sm font-extrabold text-[#006B2C]">
                  3. Bảo mật dữ liệu &amp; ảnh Live Try-On
                </h3>
                <p className="text-xs text-[#5B6776] leading-relaxed">
                  Khung hình thử đồ AI và thông tin giao dịch Ví ReHome / MoMo / VNPay được mã hóa
                  và chỉ sử dụng cho phiên trải nghiệm của chính bạn.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="bg-[#EBF1E8] border-t border-[#DDE5D9] px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="inline-flex items-center gap-2 text-xs text-[#5B6776]">
            <MailIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
            <span>
              Email hỗ trợ: <strong className="text-[#1F2A37]">{FOOTER_CONTACT.email}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#041E12] hover:bg-[#062B19] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
          >
            Đã Hiểu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
