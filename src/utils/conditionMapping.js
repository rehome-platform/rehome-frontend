/**
 * ReHome - Condition Mapping Utility
 * Maps condition value (1-5) to actual percentage and label
 * Centralized mapping to ensure consistency across UI components
 */

export const CONDITION_MAP = {
  1: { percentage: 100, label: "Còn tem (Mới 100%, chưa qua sử dụng, còn tag/mác)", shortLabel: "Còn tem (100%)" },
  2: { percentage: 99, label: "Như mới (Độ mới 99%, dùng thử 1-2 lần, hoàn hảo)", shortLabel: "Như mới (99%)" },
  3: { percentage: 95, label: "Tốt (Độ mới 95%, hao mòn rất ít, chất lượng tốt)", shortLabel: "Tốt (95%)" },
  4: { percentage: 80, label: "Có khuyết điểm nhỏ (Hao mòn vừa phải, không rách hỏng lớn)", shortLabel: "Có khuyết điểm (80%)" },
  5: { percentage: 60, label: "Cũ (Dùng nhiều, phù hợp tái chế hoặc giá rẻ)", shortLabel: "Cũ (60%)" }
};

/**
 * Get percentage display from condition value
 * @param {number} conditionValue
 * @returns {number}
 */
export function getConditionPercentage(conditionValue) {
  return CONDITION_MAP[conditionValue]?.percentage || 90;
}

/**
 * Get full label from condition value
 * @param {number} conditionValue
 * @returns {string}
 */
export function getConditionLabel(conditionValue) {
  return CONDITION_MAP[conditionValue]?.label || "Không xác định";
}

/**
 * Get short label from condition value
 * @param {number} conditionValue
 * @returns {string}
 */
export function getConditionShortLabel(conditionValue) {
  return CONDITION_MAP[conditionValue]?.shortLabel || "Chưa xác định";
}

/**
 * Validate if condition value is valid
 * @param {number} conditionValue
 * @returns {boolean}
 */
export function isValidCondition(conditionValue) {
  return conditionValue >= 1 && conditionValue <= 5;
}
