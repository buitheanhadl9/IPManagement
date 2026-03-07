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
  childUnits?: Unit[];
  ipAddressCount?: number;
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
}

export interface UnitUpdateRequest {
  name: string;
  code?: string;
  address?: string;
  parentUnitId?: number;
  description?: string;
  note?: string;
  isActive: boolean;
}