export const RECEIPT_PLACEHOLDERS = [
  {
    key: 'floorPrice',
    label: 'Giá sàn',
    editorToken: '[Giá sàn]',
    sample: '500.000 đ',
    sampleLabel: '500.000 đ',
    desc: 'Giá thấp nhất được giảm xuống của biên nhận này',
  },
  {
    key: 'withdrawalFee',
    label: 'Phí rút hàng',
    editorToken: '[Phí rút hàng]',
    sample: '50.000 đ',
    sampleLabel: '50.000 đ',
    desc: 'Phí rút hàng ngoài thời gian miễn phí',
  },
  {
    key: 'freeWithdrawalWindowDays',
    label: 'Số ngày rút miễn phí',
    editorToken: '[Số ngày rút miễn phí]',
    sample: '7',
    sampleLabel: '7 ngày',
    desc: 'Số ngày đầu mỗi kỳ được rút hàng không mất phí',
  },
  {
    key: 'degradedCompensationRate',
    label: 'Tỷ lệ đền xuống cấp',
    editorToken: '[Tỷ lệ đền xuống cấp]',
    sample: '50%',
    sampleLabel: '50%',
    desc: 'Tỷ lệ đền bù khi hàng xuống cấp, tính trên giá bán hiện tại',
  },
];

export const RECEIPT_PLACEHOLDER_MAP = Object.fromEntries(
  RECEIPT_PLACEHOLDERS.map((item) => [item.key, item]),
);

const EDITOR_TOKEN_TO_KEY = Object.fromEntries(
  RECEIPT_PLACEHOLDERS.map((item) => [item.editorToken.toLowerCase(), item.key]),
);

const PLACEHOLDER_REGEX = /(\{\{\w+\}\})/g;
const EXACT_PLACEHOLDER_REGEX = /^\{\{(\w+)\}\}$/;
const EDITOR_TOKEN_REGEX = /\[([^\]]+)\]/g;

export function templateToEditorText(bodyTemplate) {
  return String(bodyTemplate || '').replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const meta = RECEIPT_PLACEHOLDER_MAP[key];
    return meta ? meta.editorToken : match;
  });
}

export function editorTextToTemplate(editorText) {
  return String(editorText || '').replace(EDITOR_TOKEN_REGEX, (match) => {
    const mappedKey = EDITOR_TOKEN_TO_KEY[match.trim().toLowerCase()];
    return mappedKey ? `{{${mappedKey}}}` : match;
  });
}

export function tokenizeClauseTemplate(template) {
  const normalized = editorTextToTemplate(template);
  if (!normalized) return [];
  const rawTokens = normalized
    .split(PLACEHOLDER_REGEX)
    .filter((part) => part.length > 0)
    .map((part) => {
      const match = part.match(EXACT_PLACEHOLDER_REGEX);
      if (!match) {
        return { type: 'text', value: part };
      }
      const key = match[1];
      return {
        type: 'placeholder',
        raw: part,
        key,
        meta: RECEIPT_PLACEHOLDER_MAP[key] || null,
      };
    });

  // Loại khoảng trắng thừa trước dấu câu liền sau placeholder (vd: "{{floorPrice}} ." -> "500.000 đ.")
  for (let i = 1; i < rawTokens.length; i += 1) {
    if (rawTokens[i - 1].type === 'placeholder' && rawTokens[i].type === 'text') {
      rawTokens[i] = {
        ...rawTokens[i],
        value: rawTokens[i].value.replace(/^\s+([.,;:!?])/, '$1'),
      };
    }
  }

  return rawTokens;
}

export function extractUsedPlaceholders(template) {
  const tokens = tokenizeClauseTemplate(template);
  const seen = new Set();
  const used = [];
  for (const token of tokens) {
    if (token.type !== 'placeholder' || seen.has(token.key)) continue;
    seen.add(token.key);
    used.push({ key: token.key, meta: token.meta });
  }
  return used;
}

export function findUnknownPlaceholders(template) {
  return extractUsedPlaceholders(template)
    .filter((entry) => !entry.meta)
    .map((entry) => entry.key);
}
