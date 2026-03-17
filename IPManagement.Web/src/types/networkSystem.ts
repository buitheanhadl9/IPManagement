export interface NetworkSystem {
  id: number;
  externalId: string;
  name: string;
  code?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  ipAddresses: IPAddress[];
}

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

export interface NetworkSystemCreateRequest {
  name: string;
  code?: string;
  description?: string;
  status?: string;
}

export interface NetworkSystemUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  status?: string;
}

export interface NetworkSystemListResponse {
  items: NetworkSystem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface AssignIpAddressRequest {
  networkSystemId: number;
  ipAddressId: number;
}

export interface RemoveIpAddressRequest {
  networkSystemId: number;
  ipAddressId: number;
}