export interface IPAddress {
  id: number;
  externalId: string;
  unitId: number;
  unitName?: string;
  ipAddress: string;
  macAddress?: string;
  deviceName?: string;
  deviceType?: string;
  port?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  isOnline: boolean;
  lastPingTime?: string;
}

export interface IPAddressCreateRequest {
  ipAddress: string;
  macAddress?: string;
  deviceName?: string;
  deviceType?: string;
  port?: string;
  description?: string;
  status?: string;
  unitId?: number;
}

export interface IPAddressUpdateRequest {
  ipAddress: string;
  macAddress?: string;
  deviceName?: string;
  deviceType?: string;
  port?: string;
  description?: string;
  status?: string;
  unitId?: number;
}

export interface IPAddressListResponse {
  items: IPAddress[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface CheckIPStatusRequest {
  ipIds?: number[];
  ipAddresses?: string[];
}