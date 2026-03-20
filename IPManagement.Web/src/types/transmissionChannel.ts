export interface TransmissionChannel {
  id: number;
  externalId: string;
  code: string;
  provider: string;
  bandwidth: number;
  vlanId: number;
  ipRangeStart: string;
  ipRangeEnd: string;
  subnet: string;
  gateway: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  unitCount: number;
  units: UnitSelection[];
}

export interface TransmissionChannelCreateRequest {
  code: string;
  provider: string;
  bandwidth: number;
  vlanId: number;
  ipRangeStart: string;
  ipRangeEnd: string;
  subnet: string;
  gateway: string;
  unitIds?: number[];
}

export interface TransmissionChannelUpdateRequest {
  code: string;
  provider: string;
  bandwidth: number;
  vlanId: number;
  ipRangeStart: string;
  ipRangeEnd: string;
  subnet: string;
  gateway: string;
  isActive: boolean;
  unitIds?: number[];
}

export interface UnitSelection {
  id: number;
  name: string;
  code?: string;
}

export const PROVIDERS = ['VNPT', 'FPT', 'Viettel', 'Cácte'] as const;
export type Provider = typeof PROVIDERS[number];