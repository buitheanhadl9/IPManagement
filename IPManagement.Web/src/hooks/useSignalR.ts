import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './useAppSelector';
import { handlePermissionsUpdate } from '../store/slices/authSlice';
import { signalRService } from '../services/signalr.service';
import type { PermissionUpdateNotification } from '../types/notification';
import { message } from 'antd';

/**
 * Hook để quản lý SignalR connection và subscription
 */
export const useSignalR = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Chỉ kết nối khi user đã login
    if (!user) {
      if (isConnectedRef.current) {
        console.log('[useSignalR] User logged out, stopping connection...');
        signalRService.stopConnection();
        isConnectedRef.current = false;
      }
      return;
    }

    // Khởi tạo connection nếu chưa có
    const initConnection = async () => {
      try {
        await signalRService.startConnection();
        isConnectedRef.current = true;

        // Join vào group của tất cả roles mà user có
        user.roles?.forEach((role) => {
          signalRService.joinRoleGroup(role);
        });

        // Setup listener cho PermissionsUpdated event
        const unsubscribe = signalRService.onPermissionsUpdated((notification: PermissionUpdateNotification) => {
          // Dispatch action để fetch lại profile nếu cần
          dispatch(handlePermissionsUpdate(notification));
          
          // Hiển thị notification cho user
          message.success({
            content: `Quyền của role "${notification.roleName}" đã được cập nhật. Giao diện sẽ tự động đồng bộ.`,
            duration: 5,
          });
        });

        // Cleanup khi unmount
        return unsubscribe;
      } catch (error) {
        console.error('[useSignalR] Failed to initialize connection:', error);
      }
    };

    initConnection();

    // Cleanup khi unmount hoặc user thay đổi
    return () => {
      // Unsubscribe từ tất cả groups
      user?.roles?.forEach((role) => {
        signalRService.leaveRoleGroup(role);
      });
    };
  }, [user, dispatch]);

  // Re-join groups khi roles thay đổi
  useEffect(() => {
    if (!user || !isConnectedRef.current) return;

    const currentRoles = user.roles || [];
    
    // Join vào groups mới
    currentRoles.forEach((role) => {
      signalRService.joinRoleGroup(role);
    });

    // Leave khỏi groups cũ (không còn trong roles hiện tại)
    // Lưu ý: Trong thực tế, bạn có thể cần lưu trạng thái cũ để so sánh
  }, [user?.roles]);
};