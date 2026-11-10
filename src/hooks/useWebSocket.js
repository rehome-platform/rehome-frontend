import { useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext.jsx';

export { useWebSocket };

/**
 * Hook lắng nghe thông báo cá nhân real-time từ Spring Boot STOMP:
 * Destination: /user/queue/notifications
 * Payload: { id, type, title, message, isRead, targetType, targetId, warehouseId, createdAt }
 */
export function useNotificationQueue(onNotification) {
  const { service, isConnected } = useWebSocket();

  useEffect(() => {
    if (!service || !isConnected || typeof onNotification !== 'function') {
      return;
    }

    const sub = service.subscribe('/user/queue/notifications', (payload, message) => {
      onNotification(payload, message);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [service, isConnected, onNotification]);
}

/**
 * Hook lắng nghe tin nhắn chat real-time của một cuộc hội thoại cụ thể:
 * Destination: /topic/conversations.{conversationId}
 * Payload: { id, senderId, content, imageUrls, createdAt, isMine }
 */
export function useConversationTopic(conversationId, onMessage) {
  const { service, isConnected } = useWebSocket();

  useEffect(() => {
    if (!service || !isConnected || !conversationId || typeof onMessage !== 'function') {
      return;
    }

    const topic = `/topic/conversations.${conversationId}`;
    const sub = service.subscribe(topic, (payload, message) => {
      onMessage(payload, message);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [service, isConnected, conversationId, onMessage]);
}

export default useWebSocket;

