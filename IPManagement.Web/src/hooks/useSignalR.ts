import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './useAppSelector';
import { handlePermissionsUpdate } from '../store/slices/authSlice';
import { signalRService } from '../services/signalr.service';
import type { PermissionUpdateNotification, UnitUpdateNotification } from '../types/notification';
import { message } from 'antd';

// Debounce state để tránh hiển thị nhiều thông báo trùng lặp
const debounceState = {
  lastNotificationTime: 0,
  lastRoleName: ''
};

/**
 * Hook để quản lý SignalR connection và subscription
 */
export const useSignalR = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const connectionInitializedRef = useRef(false);
  const unsubscribeRef = useRef<() => void>(() => {});
  const userRef = useRef(user);

  // Cập nhật userRef khi user thay đổi
  userRef.current = user;

  useEffect(() => {
    // Chỉ kết nối khi user đã login
    if (!user) {
      if (connectionInitializedRef.current) {
        signalRService.stopConnection();
        connectionInitializedRef.current = false;
        unsubscribeRef.current();
      }
      return;
    }

    // Nếu đã khởi tạo connection rồi thì không khởi tạo lại
    if (connectionInitializedRef.current) {
      return;
    }

    // Khởi tạo connection
    const initConnection = async () => {
      try {
        await signalRService.startConnection();
        connectionInitializedRef.current = true;

        // Join vào group của tất cả roles mà user có
        user.roles?.forEach((role) => {
          signalRService.joinRoleGroup(role);
        });

        // Setup listener cho PermissionsUpdated event - chỉ setup một lần
        const unsubscribePermissions = signalRService.onPermissionsUpdated((notification: PermissionUpdateNotification) => {
          // Kiểm tra nếu user hiện tại có role bị thay đổi permissions
          const userHasRole = user?.roles?.includes(notification.roleName);
          
          if (!userHasRole) return;
          
          // Dispatch action để fetch lại profile nếu cần
          dispatch(handlePermissionsUpdate(notification));
          
          // Debounce: chỉ hiển thị notification nếu đã qua ít nhất 3 giây kể từ lần cuối
          // hoặc nếu role name khác với lần cuối
          const now = Date.now();
          const isSameRole = debounceState.lastRoleName === notification.roleName;
          const timeSinceLastNotification = now - debounceState.lastNotificationTime;
          
          if (isSameRole && timeSinceLastNotification < 3000) {
            // Lọc bỏ notification trùng lặp trong vòng 3 giây
            return;
          }
          
          // Cập nhật debounce state
          debounceState.lastNotificationTime = now;
          debounceState.lastRoleName = notification.roleName;
          
          // Hiển thị notification cho user
          message.success({
            content: `Quyền của role "${notification.roleName}" đã được cập nhật. Giao diện sẽ tự động đồng bộ.`,
            duration: 5,
            key: `perm-${notification.roleName}-${now}`,
          });
        });

        // Setup listener cho UnitUpdated event - để refresh khi có thay đổi về đơn vị
        const unsubscribeUnit = signalRService.onUnitUpdated((notification: UnitUpdateNotification) => {
          message.info({
            content: `Đơn vị "${notification.unitName || 'được cập nhật'}" đã thay đổi. Trang sẽ tự động làm mới.`,
            duration: 5,
          });
          // Trigger reload trang để cập nhật dữ liệu
          window.location.reload();
        });

        // Lưu unsubscribe function để cleanup sau
        unsubscribeRef.current = () => {
          unsubscribePermissions();
          unsubscribeUnit();
        };
      } catch (error) {
        console.error('[useSignalR] Failed to initialize connection:', error);
      }
    };

    initConnection();

    // Cleanup khi unmount hoặc user logout
    return () => {
      unsubscribeRef.current();
      connectionInitializedRef.current = false;
      userRef.current?.roles?.forEach((role) => {
        signalRService.leaveRoleGroup(role);
      });
    };
  }, [dispatch, user?.id]); // Chỉ chạy lại khi user id thay đổi (user mới login)
};