import React from "react";
import { Link } from "react-router-dom";
import Button from "../../../../components/common/Button.jsx";
import { queueService } from "../../services/warehouseApi.js";

import { Status } from "../WarehouseUi.jsx";

export function ConsignmentClaimBanner({ form, owned, resource }) {
  return (
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
  );
}

export function ConsignmentAccessNotice({  }) {
  return (
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
  );
}

export function ConsignmentFeedback({ feedback, setFeedback }) {
  return (
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
  );
}
