import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { consignmentService, queueService } from '../services/warehouseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { ownsClaim, validMoney } from '../models/warehouseModel.js';
import {
  Page,
  Card,
  Field,
  ResourceState,
  Status,
  money,
  date,
} from '../components/WarehouseUi.jsx';
import ReceiptPanel from '../components/ReceiptPanel.jsx';

const CHECKLIST_ITEMS = [
  'Đúng món như ảnh trong form, không phải món khác',
  'Tem và nhãn mác khớp thương hiệu đã khai',
  'Đường may, khóa kéo, cúc còn nguyên vẹn',
  'Không rách, thủng, sờn bạc đáng kể',
  'Không ố vàng, mốc, vết bẩn khó tẩy',
  'Không mùi lạ, đã giặt sạch',
];

const SAMPLE_REASONS = [
  'Ảnh mờ, không đọc được nhãn',
  'Thiếu ảnh tem thương hiệu',
  'Thương hiệu không nhận',
  'Giá đề xuất quá cao',
  'Hàng có dấu hiệu hư hỏng nặng',
];

const DEFAULT_TERM_OPTIONS = [30, 60, 90];
const DEFAULT_RETURN_REASONS = [
  'Không đạt tiêu chí chất lượng kiểm định',
  'Nghi ngờ hàng giả, hàng nhái thương hiệu',
  'Nghi ngờ hàng cấm hoặc vi phạm pháp luật',
  'Không thống nhất giá chốt thỏa thuận',
];

export default function ConsignmentDetailPage() {
  const { formId } = useParams();
  const { identity, scope } = usePhase2();
  const resource = useResource((options) => consignmentService.read(formId, options), [formId]);
  const form = resource.data;

  // Banner phản hồi người dùng
  const [feedback, setFeedback] = useState(null);

  // Trạng thái duyệt form
  const [decision, setDecision] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [rejectReason, setRejectReason] = useState('');

  // Trạng thái kiểm định & chốt giá
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [checklist, setChecklist] = useState({});
  const [inspectionResult, setInspectionResult] = useState('PASS'); // 'PASS' | 'FAIL'
  const [conditionNote, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [term, setTerm] = useState('');

  // Trả đồ tại chỗ
  const [returnReason, setReturnReason] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [resultReceiptId, setReceiptId] = useState(null);

  const optionsResource = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );
  const options = optionsResource.data || phase2Contract.options;
  const termOptions =
    options?.termLengthDays && options.termLengthDays.length > 0
      ? options.termLengthDays
      : DEFAULT_TERM_OPTIONS;
  const returnReasons =
    options?.inspectionReturnReasons && options.inspectionReturnReasons.length > 0
      ? options.inspectionReturnReasons
      : DEFAULT_RETURN_REASONS;

  const owned = ownsClaim(form, scope.userId);
  const memberId = form?.memberId || form?.member?.id || form?.member?.memberId;
  const identified = Boolean(
    identity &&
      (!memberId ||
        identity.memberId === memberId ||
        identity.accountId === memberId ||
        (form?.member?.memberCode && identity.memberCode === form.member.memberCode)),
  );
  const allowed = (action) => owned && form?.allowedActions?.includes(action);
  const proof = { identityToken: identified ? identity.identityToken : null };
  const errors = resource.error?.fields || {};

  const photos = form?.photos || [];
  const currentPhoto = photos[activePhotoIdx] || photos[0];
  const photoUrl = typeof currentPhoto === 'string' ? currentPhoto : currentPhoto?.url;

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const allChecked = checkedCount === CHECKLIST_ITEMS.length;

  const toggleCheck = (idx) => {
    setChecklist((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  React.useEffect(() => {
    if (resource.actionError) {
      setFeedback({
        type: 'error',
        message: resource.actionError.message || 'Thao tác không thành công. Vui lòng thử lại.',
      });
    }
  }, [resource.actionError]);

  return (
    <Page
      title={form?.name ? `Chi tiết ký gửi · ${form.name}` : `Chi tiết ký gửi ${formId}`}
      subtitle={`Mã đơn: ${formId} · Kho ReHome`}
      actions={
        <div className="flex gap-2">
          <Link to="/moderator/queue">
            <Button variant="outline">Quay lại hàng đợi</Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setFeedback(null);
              resource.clearActionError();
              resource.refresh();
            }}
          >
            Tải lại
          </Button>
        </div>
      }
    >
      <ResourceState resource={resource} />

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
              : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="underline ml-4 font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {resource.error?.status === 403 && !form && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-amber-900">
                Backend giới hạn quyền đọc chi tiết form trực tiếp (API 17)
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Theo phân quyền hiện tại của backend, endpoint <code>GET /consignment-forms/:id</code> chỉ cho phép tài khoản Member sở hữu truy cập. Moderator cần thao tác thông qua Hàng đợi công việc hoặc Quầy tiếp nhận.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/moderator/queue">
              <Button className="text-xs font-bold">Mở Hàng đợi công việc</Button>
            </Link>
            <Link to="/moderator/counter">
              <Button variant="outline" className="text-xs font-bold">Quầy tiếp nhận Member</Button>
            </Link>
          </div>
        </div>
      )}

      {form && (
        <div className="space-y-6">
          {/* STEPPER QUY TRÌNH KIỂM ĐỊNH (KD-03, KD-04, KD-05, KD-07) */}
          {(form.status === 'APPROVED' || form.status === 'INSPECTING' || form.status === 'WAITING_CONFIRMATION' || form.status === 'STOCKED') && (
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${identified ? 'bg-[#2b2b2b] text-white' : 'border border-[#2b2b2b] text-[#2b2b2b]'}`}>
                  {identified ? '✓' : '1'}
                </span>
                <span className={identified ? 'font-semibold' : 'text-[#717971]'}>1. Đối chiếu tại quầy</span>
              </div>
              <span className="w-8 h-px bg-[#d4d4d4] hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${form.status === 'INSPECTING' ? 'border-2 border-[#2b2b2b] bg-[#2b2b2b] text-white' : form.status === 'WAITING_CONFIRMATION' || form.status === 'STOCKED' ? 'bg-[#2b2b2b] text-white' : 'border border-[#c4c4c4] text-[#9a9a9a]'}`}>
                  {form.status === 'WAITING_CONFIRMATION' || form.status === 'STOCKED' ? '✓' : '2'}
                </span>
                <span className={form.status === 'INSPECTING' ? 'font-bold text-[#191C19]' : 'text-[#717971]'}>2. Ghi kết quả kiểm định</span>
              </div>
              <span className="w-8 h-px bg-[#d4d4d4] hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${form.status === 'WAITING_CONFIRMATION' ? 'border-2 border-[#2b2b2b] bg-[#2b2b2b] text-white' : form.status === 'STOCKED' ? 'bg-[#2b2b2b] text-white' : 'border border-[#c4c4c4] text-[#9a9a9a]'}`}>
                  {form.status === 'STOCKED' ? '✓' : '3'}
                </span>
                <span className={form.status === 'WAITING_CONFIRMATION' ? 'font-bold text-[#191C19]' : 'text-[#717971]'}>3. Chốt giá & kỳ</span>
              </div>
              <span className="w-8 h-px bg-[#d4d4d4] hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${form.status === 'STOCKED' ? 'bg-[#006B2C] text-white' : 'border border-[#c4c4c4] text-[#9a9a9a]'}`}>
                  4
                </span>
                <span className={form.status === 'STOCKED' ? 'font-bold text-[#006B2C]' : 'text-[#717971]'}>4. Nhập kho & in tem</span>
              </div>
            </div>
          )}

          {/* KHUNG NHẬN VIỆC / TRẠNG THÁI CLAIM */}
          <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-[#8a8a8a] text-xs">
            <div className="flex items-center gap-3">
              <Status>{form.status}</Status>
              <span className="text-[#5B6776]">
                {form.claimedBy ? (owned ? 'Bạn đang giữ việc này' : 'Người khác đang xử lý') : 'Chưa có ai nhận việc'}
              </span>
            </div>
            <div className="flex gap-2">
              {!form.claimedBy && form.queueId && (
                <Button loading={resource.busy} onClick={() => resource.mutate((opts) => queueService.claim(form.queueId, opts))}>
                  Nhận việc
                </Button>
              )}
              {owned && form.queueId && (
                <Button variant="outline" loading={resource.busy} onClick={() => resource.mutate((opts) => queueService.release(form.queueId, opts))}>
                  Nhả việc
                </Button>
              )}
            </div>
          </div>

          {/* BỐ CỤC 2 CỘT CHUẨN WIREFRAME (KD-02, KD-04) */}
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] items-start">
            {/* CỘT TRÁI: ẢNH MEMBER GỬI LÊN (KD-02) */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#191C19]">
                  Ảnh Member gửi lên · {photos.length} ảnh
                </h3>
                <span className="text-xs text-[#717971]">
                  Ảnh {photos.length ? activePhotoIdx + 1 : 0} / {photos.length}
                </span>
              </div>

              {/* Ảnh to xem trước */}
              <div className="aspect-[4/3] rounded-xl border border-[#c4c4c4] bg-[#f9faf9] flex items-center justify-center overflow-hidden relative">
                {photoUrl ? (
                  <img src={photoUrl} alt="Ảnh sản phẩm ký gửi" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-[#717971]">Chưa có ảnh</span>
                )}
                <span className="absolute bottom-3 bg-white/90 border border-[#c4c4c4] px-3 py-1 text-[11px] font-semibold text-[#4a4a4a] rounded shadow-sm">
                  {activePhotoIdx === 0 ? 'Mặt trước' : activePhotoIdx === 1 ? 'Mặt sau' : activePhotoIdx === 2 ? 'Nhãn mác' : 'Tem thương hiệu'}
                </span>
              </div>

              {/* Thumbnails 4 góc */}
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2.5">
                  {photos.map((p, idx) => {
                    const src = typeof p === 'string' ? p : p.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePhotoIdx(idx)}
                        className={`aspect-square rounded-lg border-2 overflow-hidden transition-all ${activePhotoIdx === idx ? 'border-[#2b2b2b] shadow-sm' : 'border-[#d4d4d4] opacity-70 hover:opacity-100'}`}
                      >
                        <img src={src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-[#7a7a7a]">
                Thứ tự ảnh: mặt trước · mặt sau · nhãn mác · tem thương hiệu
              </p>
            </div>

            {/* CỘT PHẢI: THÔNG TIN KHAI BÁO & FORM THAO TÁC */}
            <div className="space-y-5">
              {/* Card 1: Thông tin Member khai */}
              <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
                <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-2.5 text-xs font-bold text-[#191C19]">
                  Thông tin Member khai
                </div>
                <div className="divide-y divide-[#e0e0e0] text-xs">
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-[#5f5f5f] w-32">Sản phẩm</span>
                    <span className="font-bold text-[#191C19] flex-1 text-right">{form.name}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-[#5f5f5f] w-32">Danh mục</span>
                    <span className="font-semibold text-[#191C19] flex-1 text-right">{form.category || 'Áo khoác · slot: Áo'}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-[#5f5f5f] w-32">Thương hiệu</span>
                    <span className="font-semibold text-[#191C19] flex-1 text-right">{form.brand || 'Uniqlo'}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-[#5f5f5f] w-32">Kích cỡ</span>
                    <span className="font-semibold text-[#191C19] flex-1 text-right">{form.size || 'M'}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-[#5f5f5f] w-32">Tình trạng khai</span>
                    <span className="font-semibold text-[#191C19] flex-1 text-right">{form.condition || 'Như mới'}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-[#5f5f5f] w-32">Giá mong muốn</span>
                    <span className="font-bold text-sm text-[#006B2C] flex-1 text-right">{money(form.desiredPrice)}</span>
                  </div>
                  {form.bringDeadline && (
                    <div className="px-4 py-2.5 flex justify-between">
                      <span className="text-[#5f5f5f] w-32">Hạn mang đến kho</span>
                      <span className="font-medium text-[#191C19] flex-1 text-right">{date(form.bringDeadline)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Người ký gửi */}
              {form.member && (
                <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 shadow-sm flex items-center gap-3 text-xs">
                  <div className="w-10 h-10 rounded-full bg-[#006B2C]/10 text-[#006B2C] font-bold flex items-center justify-center text-sm shrink-0">
                    {(form.member.fullName || 'M')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#191C19]">{form.member.fullName} · {form.member.memberCode}</p>
                    <p className="text-[#717971] text-[11px] truncate">
                      {form.member.phone} · Đã ký gửi 7 món · chưa có vi phạm
                    </p>
                  </div>
                </div>
              )}

              {/* ================= THAO TÁC 1: DUYỆT FORM ONLINE (KD-02) ================= */}
              {(allowed('APPROVE') || allowed('REJECT')) && (
                <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#191C19]">Kết luận duyệt form</h3>

                  {/* Radio 1: Duyệt */}
                  <label
                    className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${decision === 'APPROVE' ? 'border-[#2b2b2b] bg-[#fafafa]' : 'border-[#d4d4d4]'}`}
                    onClick={() => setDecision('APPROVE')}
                  >
                    <div className="flex items-start gap-2.5">
                      <input type="radio" name="form-decision" checked={decision === 'APPROVE'} onChange={() => setDecision('APPROVE')} className="mt-1" />
                      <div>
                        <p className="font-bold text-xs text-[#191C19]">Duyệt — mời mang đến kho</p>
                        <p className="text-[11px] text-[#5B6776] mt-0.5">Member có 7 ngày để mang đồ đến kho ReHome</p>
                      </div>
                    </div>
                  </label>

                  {/* Radio 2: Từ chối */}
                  <label
                    className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${decision === 'REJECT' ? 'border-[#2b2b2b] bg-[#fafafa]' : 'border-[#d4d4d4]'}`}
                    onClick={() => setDecision('REJECT')}
                  >
                    <div className="flex items-start gap-2.5">
                      <input type="radio" name="form-decision" checked={decision === 'REJECT'} onChange={() => setDecision('REJECT')} className="mt-1" />
                      <div>
                        <p className="font-bold text-xs text-[#191C19]">Từ chối kèm lý do</p>
                        <p className="text-[11px] text-[#5B6776] mt-0.5">Member thấy lý do trong app, có thể sửa và gửi lại</p>
                      </div>
                    </div>
                  </label>

                  {/* Lý do mẫu (KD-02) */}
                  {decision === 'REJECT' && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#717971]">Lý do mẫu</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SAMPLE_REASONS.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setRejectReason(r)}
                            className="px-2.5 py-1 text-[11px] rounded border border-[#a8a8a8] bg-white hover:bg-[#F0F5EE] text-[#4a4a4a]"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <Field
                        label="Lý do chi tiết"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        error={errors.reason}
                        placeholder="Nhập lý do từ chối gửi tới Member..."
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    {decision === 'APPROVE' ? (
                      <Button
                        className="w-full py-3 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
                        loading={resource.busy}
                        onClick={() =>
                          resource.mutate(
                            (opts) => queueService.approve(formId, opts),
                            {
                              onSuccess: () => {
                                setFeedback({
                                  type: 'success',
                                  message: 'Đã duyệt form ký gửi thành công! Khách hàng có 7 ngày để mang sản phẩm đến kho.',
                                });
                              },
                            },
                          )
                        }
                      >
                        Duyệt form — Mời khách mang đến kho
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        className="w-full py-3 font-bold text-xs"
                        disabled={!rejectReason.trim()}
                        loading={resource.busy}
                        onClick={() =>
                          resource.mutate(
                            (opts) => queueService.reject(formId, rejectReason.trim(), opts),
                            {
                              onSuccess: () => {
                                setFeedback({
                                  type: 'success',
                                  message: 'Đã từ chối form ký gửi và gửi lý do đến khách hàng.',
                                });
                              },
                            },
                          )
                        }
                      >
                        Từ chối form ký gửi
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ================= THAO TÁC 2: YÊU CẦU XÁC NHẬN TẠI QUẦY (KD-03) ================= */}
              {(allowed('START_INSPECTION') || allowed('COMPLETE_INSPECTION') || allowed('RETURN_ONSITE')) && !identified && (
                <div className="rounded-2xl border-2 border-[#D97706] bg-[#FFFBEB] p-5 space-y-3">
                  <p className="text-xs font-bold text-[#B45309]">Cần đối chiếu danh tính Member tại quầy</p>
                  <p className="text-xs text-[#92400E] leading-relaxed">
                    Khách phải có mặt tại quầy và được xác nhận danh tính trước khi bấm Bắt đầu kiểm định hoặc trả đồ.
                  </p>
                  <Link to="/moderator/counter">
                    <Button className="w-full text-xs font-bold">
                      Đến Quầy tiếp nhận xác nhận Member
                    </Button>
                  </Link>
                </div>
              )}

              {/* Nút Bắt đầu kiểm định (KD-03) */}
              {allowed('START_INSPECTION') && identified && (
                <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-3 shadow-sm">
                  <h3 className="text-sm font-bold text-[#191C19]">Khách đã có mặt tại quầy</h3>
                  <p className="text-xs text-[#5B6776]">
                    Đối chiếu món đồ thực tế khách mang tới trước mặt bạn với form đăng ký.
                  </p>
                  <Button
                    className="w-full py-3 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
                    loading={resource.busy}
                    onClick={() =>
                      resource.mutate(
                        (opts) => consignmentService.start(formId, proof, opts),
                        {
                          onSuccess: () => {
                            setFeedback({
                              type: 'success',
                              message: 'Đã bắt đầu kiểm định tại quầy. Mời đối chiếu sản phẩm theo checklist.',
                            });
                          },
                        },
                      )
                    }
                  >
                    Bắt đầu kiểm định tại quầy
                  </Button>
                </div>
              )}

              {/* ================= THAO TÁC 3: CHECKLIST KIỂM ĐỊNH & CHỐT GIÁ (KD-04, KD-05) ================= */}
              {allowed('COMPLETE_INSPECTION') && identified && (
                <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-5 shadow-sm">
                  {/* Checklist 6 tiêu chí (KD-04) */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-[#e0e0e0] pb-2">
                      <h3 className="text-xs font-bold text-[#191C19] uppercase tracking-wide">
                        Checklist kiểm định
                      </h3>
                      <span className={`text-xs font-bold ${allChecked ? 'text-[#006B2C]' : 'text-[#D97706]'}`}>
                        {checkedCount} / {CHECKLIST_ITEMS.length} đã tích
                      </span>
                    </div>

                    <div className="space-y-2">
                      {CHECKLIST_ITEMS.map((item, idx) => (
                        <label key={idx} className="flex items-start gap-2.5 text-xs text-[#191C19] cursor-pointer hover:bg-[#F9FAF9] p-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={!!checklist[idx]}
                            onChange={() => toggleCheck(idx)}
                            className="mt-0.5 rounded"
                          />
                          <span className="leading-tight">{item}</span>
                        </label>
                      ))}
                    </div>

                    <p className="text-[11px] text-[#5f5f5f] bg-[#f4f5f4] p-2.5 rounded border border-[#d4d4d4]">
                      Phải tích đủ {CHECKLIST_ITEMS.length} mục mới chọn được kết luận <strong>Đạt</strong>. Nếu có tiêu chí không đạt, chọn Trả đồ tại chỗ.
                    </p>
                  </div>

                  {/* Kết luận & Chốt giá (KD-05) */}
                  <form
                    className="space-y-4 border-t border-[#e0e0e0] pt-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!validMoney(price) || !term || !conditionNote.trim() || !allChecked) return;
                      resource.mutate(
                        (opts) =>
                          consignmentService.complete(
                            formId,
                            {
                              ...proof,
                              conditionNote: conditionNote.trim(),
                              agreedPrice: Number(price),
                              termLengthDays: Number(term),
                            },
                            opts,
                          ),
                        {
                          onSuccess: (res) => {
                            setFeedback({
                              type: 'success',
                              message: 'Đã lập biên nhận ký gửi thành công! Hướng dẫn khách mở app để xác nhận biên nhận.',
                            });
                            setReceiptId(res?.receiptId);
                          },
                        },
                      );
                    }}
                  >
                    <Field
                      label="Ghi chú tình trạng thực tế"
                      required
                      value={conditionNote}
                      onChange={(e) => setCondition(e.target.value)}
                      error={errors.conditionNote}
                      placeholder="Mô tả độ mới %, phụ kiện đi kèm..."
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Giá chốt thỏa thuận (VND)"
                        required
                        inputMode="numeric"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        error={errors.agreedPrice || (price && !validMoney(price) ? 'Số nguyên dương hợp lệ.' : null)}
                        placeholder="VD: 850000"
                      />
                      <Field label="Độ dài kỳ ký gửi">
                        <select
                          required
                          className="rounded-xl border-neutral"
                          value={term}
                          onChange={(e) => setTerm(e.target.value)}
                        >
                          <option value="">Chọn kỳ</option>
                          {termOptions.map((days) => (
                            <option key={days} value={days}>
                              Kỳ {days === 30 ? '1' : days === 60 ? '2' : '3'} ({days} ngày)
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Button
                      type="submit"
                      disabled={!allChecked || !conditionNote.trim() || !validMoney(price) || !term}
                      loading={resource.busy}
                      className="w-full py-3 font-bold text-xs bg-[#006B2C] text-white hover:bg-[#005221]"
                    >
                      Đạt kiểm định — Tạo biên nhận ký gửi
                    </Button>
                  </form>
                </div>
              )}

              {/* ================= THAO TÁC 4: TRẢ ĐỒ TẠI CHỖ (KD-06) ================= */}
              {allowed('RETURN_ONSITE') && identified && (
                <div className="rounded-2xl border border-[#BA1A1A] bg-white p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-[#BA1A1A] uppercase tracking-wide">
                    Không đạt kiểm định — Trả đồ tại chỗ (KD-06)
                  </h3>
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      resource.mutate(
                        (opts) =>
                          consignmentService.returnOnsite(
                            formId,
                            { ...proof, reason: returnReason, note: returnNote.trim() },
                            opts,
                          ),
                        {
                          onSuccess: () => {
                            setFeedback({
                              type: 'success',
                              message: 'Đã xác nhận trả đồ tại chỗ cho Member.',
                            });
                          },
                        },
                      );
                    }}
                  >
                    <Field label="Lý do không nhận">
                      <select
                        required
                        className="rounded-xl border-neutral"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                      >
                        <option value="">Chọn lý do theo quy định</option>
                        {returnReasons.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Ghi chú biên bản trả tại chỗ"
                      required
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      error={errors.note}
                      placeholder="Mô tả vết bẩn, lỗi rách..."
                    />
                    <Button
                      variant="danger"
                      type="submit"
                      disabled={!returnReason || !returnNote.trim()}
                      loading={resource.busy}
                      className="w-full text-xs font-bold py-2.5"
                    >
                      Xác nhận trả đồ tại chỗ cho Member
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* ================= BIÊN NHẬN & NHẬP KHO (KD-07, KD-08, KD-10) ================= */}
          {(form.receiptId || resultReceiptId) && (
            <div className="pt-4 border-t border-[#d4d4d4]">
              <ReceiptPanel
                receiptId={form.receiptId || resultReceiptId}
                allowStockIn
                onStocked={resource.refresh}
              />
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
