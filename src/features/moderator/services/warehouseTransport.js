import baseApi from '../../../services/baseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import {
  normalizeError,
  Phase2Error,
  unwrap,
} from '../models/warehouseModel.js';

export async function request(
  operation,
  { ids = {}, params, data, signal, onUploadProgress, scope } = {},
) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (isFixtureMode) {
    const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
    return fixtureRequest(operation, { ids, params, data, signal, scope });
  }
  const config = operationConfig(operation);
  requireWarehouse(scope);
  const url = resolvePath(config.path, ids);
  return sendRequest(contractRequest(config, { url, params, data, signal, onUploadProgress }));
}

function operationConfig(operation) {
  const config = phase2Contract.operations[operation];
  if (!config || config.supported === false) {
    throw new Phase2Error(config?.reason || 'Backend chưa hỗ trợ thao tác này.', 501, 'OPERATION_UNSUPPORTED');
  }
  if (!contractReady(config)) {
    throw new Phase2Error(
      `Chờ bàn giao contract backend (Gate ${config?.gate ?? '—'}).`,
      0,
      'CONTRACT_BLOCKED',
    );
  }
  return config;
}

function contractReady(config) {
  return phase2Contract.revision && phase2Contract.gates[config.gate] && config.path;
}

function requireWarehouse(scope) {
  if (!scope?.warehouseId)
    throw new Phase2Error('Tài khoản chưa có thông tin kho được backend xác nhận.', 403);
}

function resolvePath(path, ids) {
  return path.replace(/:([a-zA-Z]+)/g, (_, key) => {
    if (!ids[key]) throw new Phase2Error(`Thiếu định danh ${key}.`, 422);
    return encodeURIComponent(ids[key]);
  });
}

function contractRequest(config, { url, params, data, signal, onUploadProgress }) {
  return {
      method: config.method,
      url,
      params: config.params ? { ...config.params, ...params } : params,
      data,
      signal,
      ...(config.responseType ? { responseType: config.responseType } : {}),
      noReplay: config.method.toLowerCase() !== 'get',
      onUploadProgress,
      ...formDataHeaders(data),
  };
}

function formDataHeaders(data) {
  return data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {};
}

export async function callBackend(config, { fallback, signal } = {}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (isFixtureMode && fallback) {
    return await fallback();
  }
  return sendRequest({
      ...config,
      signal,
      noReplay: config.method?.toLowerCase() !== 'get',
      ...formDataHeaders(config.data),
  });
}

async function sendRequest(config) {
  try {
    const response = await baseApi.request(config);
    return unwrap(response);
  } catch (error) {
    if (config.signal?.aborted || error.code === 'ERR_CANCELED') throw error;
    // Fixture data is selected only before a request in explicit development mode.
    // A failed real request must always remain a failure, including reads and 404s.
    throw normalizeError(error);
  }
}
