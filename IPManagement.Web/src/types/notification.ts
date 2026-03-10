/**
 * DTO cho permission update notification từ backend
 */
export interface PermissionUpdateNotification {
  roleName: string;
  updatedPermissions: string[];
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Event types cho SignalR notifications
 */
export type NotificationType = 'PermissionsUpdated' | 'UserNotification';