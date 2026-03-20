import { HubConnectionBuilder, HubConnection, HubConnectionState, LogLevel } from '@microsoft/signalr';
import type { PermissionUpdateNotification, UnitUpdateNotification } from '../types/notification';

const SIGNALR_HUB_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

class SignalRService {
  private connection: HubConnection | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private readonly RECONNECT_DELAY = 3000; // 3 seconds

  // Callbacks cho các event
  private onPermissionsUpdatedCallbacks: ((notification: PermissionUpdateNotification) => void)[] = [];
  private onUserNotificationCallbacks: ((message: string) => void)[] = [];
  private onUnitUpdatedCallbacks: ((notification: UnitUpdateNotification) => void)[] = [];
  private onConnectedCallbacks: (() => void)[] = [];
  private onDisconnectedCallbacks: (() => void)[] = [];

  /**
   * Khởi tạo SignalR connection
   */
  public async startConnection(): Promise<void> {
    if (this.connection) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      this.connection = new HubConnectionBuilder()
        .withUrl(`${SIGNALR_HUB_URL}/notificationHub`, {
          accessTokenFactory: () => token || '',
          transport: 1, // HttpTransportType.WebSockets
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Information)
        .build();

      // Setup event handlers
      this.setupEventHandlers();

      // Start connection
      await this.connection.start();
      this.reconnectAttempts = 0;

      // Trigger connected callbacks
      this.onConnectedCallbacks.forEach(cb => cb());

    } catch (error) {
      console.error('[SignalR] Connection failed:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.startConnection(), this.RECONNECT_DELAY);
      }
    }
  }

  /**
   * Setup event handlers cho SignalR
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Handle PermissionsUpdated event
    this.connection.on('PermissionsUpdated', (notification: PermissionUpdateNotification) => {
      this.onPermissionsUpdatedCallbacks.forEach(cb => cb(notification));
    });

    // Handle UserNotification event
    this.connection.on('UserNotification', (message: string) => {
      this.onUserNotificationCallbacks.forEach(cb => cb(message));
    });

    // Handle UnitUpdated event
    this.connection.on('UnitUpdated', (notification: UnitUpdateNotification) => {
      this.onUnitUpdatedCallbacks.forEach(cb => cb(notification));
    });

    // Handle close event
    this.connection.onclose(() => {
      this.onDisconnectedCallbacks.forEach(cb => cb());
    });
  }

  /**
   * Join vào group của role
   */
  public async joinRoleGroup(roleName: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke('JoinGroup', `role:${roleName}`);
    } catch (error) {
      console.error(`[SignalR] Failed to join group role:${roleName}:`, error);
    }
  }

  /**
   * Rời group của role
   */
  public async leaveRoleGroup(roleName: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke('LeaveGroup', `role:${roleName}`);
    } catch (error) {
      console.error(`[SignalR] Failed to leave group role:${roleName}:`, error);
    }
  }

  /**
   * Đăng ký callback cho PermissionsUpdated event
   */
  public onPermissionsUpdated(callback: (notification: PermissionUpdateNotification) => void): () => void {
    this.onPermissionsUpdatedCallbacks.push(callback);
    return () => {
      this.onPermissionsUpdatedCallbacks = this.onPermissionsUpdatedCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Đăng ký callback cho UserNotification event
   */
  public onUserNotification(callback: (message: string) => void): () => void {
    this.onUserNotificationCallbacks.push(callback);
    return () => {
      this.onUserNotificationCallbacks = this.onUserNotificationCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Đăng ký callback cho UnitUpdated event
   */
  public onUnitUpdated(callback: (notification: UnitUpdateNotification) => void): () => void {
    this.onUnitUpdatedCallbacks.push(callback);
    return () => {
      this.onUnitUpdatedCallbacks = this.onUnitUpdatedCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Đăng ký callback cho connected event
   */
  public onConnected(callback: () => void): () => void {
    this.onConnectedCallbacks.push(callback);
    return () => {
      this.onConnectedCallbacks = this.onConnectedCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Đăng ký callback cho disconnected event
   */
  public onDisconnected(callback: () => void): () => void {
    this.onDisconnectedCallbacks.push(callback);
    return () => {
      this.onDisconnectedCallbacks = this.onDisconnectedCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Check xem connection đã được kết nối chưa
   */
  public isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  /**
   * Đóng connection
   */
  public async stopConnection(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.error('[SignalR] Error stopping connection:', error);
      }
      this.connection = null;
    }
  }
}

export const signalRService = new SignalRService();