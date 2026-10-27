import { normalizeError, Phase2Error } from '../models/warehouseTransportModel.js';

function readBlobWithFileReader(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

async function parseBlob(blob) {
  try {
    if (typeof blob.text === 'function') return JSON.parse(await blob.text());
    if (typeof FileReader !== 'undefined') return JSON.parse(await readBlobWithFileReader(blob));
  } catch { /* Retain the original body when the server does not return JSON. */ }
  return blob;
}

async function parseErrorBody(body) {
  if (typeof Blob !== 'undefined' && body instanceof Blob) return parseBlob(body);
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return body; }
  }
  return body;
}

function hasServerMessage(body) {
  return body && typeof body === 'object' && (body.code || body.message);
}

export async function skuLabelError(error) {
  if (error.response?.data) {
    const body = await parseErrorBody(error.response.data);
    if (hasServerMessage(body)) {
      return new Phase2Error(body.message || 'Lỗi in tem SKU', error.response.status, body.code || '');
    }
  }
  return normalizeError(error);
}
