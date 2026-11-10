/**
 * Resolves the destination URL for a given notification based on targetType, targetId, and userRole.
 *
 * @param {Object} [notification] - Notification object
 * @param {string} [notification.targetType] - Target entity type (e.g. CONSIGNMENT, ORDER, RETURN, INVENTORY, etc.)
 * @param {string|number} [notification.targetId] - Target entity identifier (formId, sku, orderId, etc.)
 * @param {string} [userRole='moderator'] - Role of current user ('moderator', 'staff', 'admin')
 * @returns {string} Application route path
 */
export function resolveNotificationUrl(notification, userRole) {
  let role = 'moderator';
  if (typeof userRole === 'string' && userRole.trim()) {
    role = userRole.trim().toLowerCase();
  } else if (notification && typeof notification === 'object' && notification.role) {
    role = String(notification.role).trim().toLowerCase();
  }

  const defaultRoute = role === 'admin' ? '/admin' : '/moderator';

  if (!notification || typeof notification !== 'object') {
    return defaultRoute;
  }

  const rawType = notification.targetType;
  if (!rawType || typeof rawType !== 'string') {
    return defaultRoute;
  }

  const type = rawType.trim().toUpperCase();
  const id = notification.targetId != null ? String(notification.targetId).trim() : '';

  if (role === 'admin') {
    switch (type) {
      case 'ACCOUNT':
      case 'MEMBER':
      case 'ORGANIZATION':
      case 'USER':
        return '/admin/users';

      case 'MODERATOR':
      case 'STAFF':
        return '/admin/moderators';

      case 'WAREHOUSE':
        return '/admin/warehouses';

      case 'VIOLATION':
      case 'REPORT':
      case 'VIOLATION_REPORT':
        return '/admin/users';

      case 'AUDIT':
      case 'AUDIT_LOG':
        return '/admin/audit-logs';

      case 'CONFIG':
      case 'SYSTEM_CONFIG':
        return '/admin/configs';

      default:
        return '/admin';
    }
  }

  // Moderator / Staff / Default fallback
  switch (type) {
    case 'CONSIGNMENT':
    case 'CONSIGNMENT_FORM':
      return id ? `/moderator/consignments/${id}` : '/moderator/consignments';

    case 'PACKING':
    case 'ORDER':
      return '/moderator/packing';

    case 'WITHDRAWAL':
    case 'ITEM_WITHDRAWAL':
    case 'WITHDRAWAL_REQUEST':
      return id ? `/moderator/counter?refId=${encodeURIComponent(id)}` : '/moderator/queue?type=WITHDRAWAL';

    case 'DEGRADED_ITEM':
    case 'DEGRADED_ITEM_CASE':
      return id ? `/moderator/inventory?status=DEGRADED&caseId=${encodeURIComponent(id)}` : '/moderator/inventory?status=DEGRADED';

    case 'END_OF_TERM':
    case 'TERM_EXPIRY':
      return id ? `/moderator/inventory/${encodeURIComponent(id)}/re-consign` : '/moderator/end-of-term';

    case 'RETURN':
    case 'RETURN_REQUEST':
      return '/moderator/returns';

    case 'ORGANIZATION':
    case 'VERIFICATION':
      return '/moderator/verifications';

    case 'VIOLATION':
    case 'REPORT':
      return '/moderator/reports';

    case 'VIOLATION_REPORT':
      return id ? `/moderator/reports?id=${encodeURIComponent(id)}` : '/moderator/reports';

    case 'INVENTORY':
    case 'PRODUCT':
      return id ? `/moderator/inventory/${id}` : '/moderator/inventory';

    case 'INBOX':
    case 'CONVERSATION':
      return '/moderator/inbox';

    default:
      return '/moderator';
  }
}
