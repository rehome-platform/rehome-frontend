import { fixtureFallback } from './fixtureTransport.js';
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from "../config/warehouseContract.js";
import { normalizeConsignmentForm } from "../models/warehouseModel.js";
import { callBackend } from './warehouseTransport.js';
import { queueService } from './queueApi.js';

export const consignmentService = {
  // API 31: POST /consignment-forms/{id}/approve
  approve: (formId, options) => queueService.approve(formId, options),

  // API 32: POST /consignment-forms/{id}/reject
  reject: (formId, reason, options) => queueService.reject(formId, reason, options),

  // API 17: GET /consignment-forms/{id}
  read: async (formId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('formRead', { ids: { formId }, ...options });
      return normalizeConsignmentForm(res, options?.scope?.userId);
    };

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.CONSIGNMENT_FORM_DETAIL(formId),
      },
      { fallback, signal: options?.signal }
    );
    return normalizeConsignmentForm(res, options?.scope?.userId);
  },

  // API 33: POST /consignment-forms/{id}/inspection/start
  start: async (formId, data, options) => {
    const fallback = fixtureFallback('inspectionStart', { ids: { formId }, data, ...options });

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.START_INSPECTION(formId),
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 34: POST /consignment-forms/{id}/inspection/complete
  complete: async (formId, data, options) => {
    const fallback = fixtureFallback('inspectionComplete', { ids: { formId }, data, ...options });

    const payload = {
      result: data?.result || 'PASS',
      conditionNote: data?.conditionNote || data?.condition || 'Tốt',
      agreedPrice: Number(data?.agreedPrice || data?.price || 0),
      ...(data?.termLengthDays ? { termLengthDays: Number(data.termLengthDays) } : {}),
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COMPLETE_INSPECTION(formId),
        data: payload,
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 35: POST /consignment-forms/{id}/return-onsite
  returnOnsite: async (formId, data, options) => {
    const fallback = fixtureFallback('returnOnsite', { ids: { formId }, data, ...options });

    const reason = data?.note?.trim()
      ? (data?.reason ? `${data.reason}: ${data.note.trim()}` : data.note.trim())
      : (data?.reason || 'Không đạt kiểm định tại quầy');

    const payload = {
      result: data?.result || 'FAIL',
      reason,
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RETURN_ONSITE(formId),
        data: payload,
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 19: GET /consignment-receipts/{id}
  receipt: async (receiptId, options) => {
    const fallback = fixtureFallback('receiptRead', { ids: { receiptId }, ...options });

    return callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.RECEIPT_DETAIL(receiptId),
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 19 (F-023): GET /consignment-receipts/{id}/pdf
  pdf: async (receiptId, options) => {
    const fallback = fixtureFallback('receiptPdf', { ids: { receiptId }, ...options });

    if (isFixtureMode) return fallback();

    const response = await baseApi.get(API_ENDPOINTS.MODERATOR.RECEIPT_PDF(receiptId), {
      responseType: 'blob',
      signal: options?.signal,
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return { pdfUrl: URL.createObjectURL(blob) };
  },
};
