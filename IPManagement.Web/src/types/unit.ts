export interface Unit {
  id: number;
  externalId: string;
  name: string;
  code?: string;
  address?: string;
  parentUnitId?: number;
  parentUnitName?: string;
  description?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  displayOrder?: number;
  childUnits?: Unit[];
  ipAddressCount?: number;
  transmissionChannelIds?: number[];
  latitude?: number;
  longitude?: number;
}

export interface UnitTree {
  id: number;
  externalId: string;
  name: string;
  code?: string;
  ChildUnits?: UnitTree[];
  childUnits?: UnitTree[]; // fallback for compatibility
  ipAddressCount?: number;
}

export interface UnitCreateRequest {
  name: string;
  code?: string;
  address?: string;
  parentUnitId?: number;
  description?: string;
  note?: string;
  transmissionChannelIds?: number[];
  latitude?: number;
  longitude?: number;
}

export interface UnitUpdateRequest {
  name: string;
  code?: string;
  address?: string;
  parentUnitId?: number;
  description?: string;
  note?: string;
  isActive: boolean;
  displayOrder?: number;
  transmissionChannelIds?: number[];
  latitude?: number;
  longitude?: number;
}

export interface UnitSelectionDto {
  id: number;
  name: string;
  code?: string;
}

export interface TransmissionChannelSelection {
  id: number;
  code: string;
  provider: string;
}