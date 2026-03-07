export interface UserUnit {
  id: number;
  name: string;
  role: string;
  isPrimary: boolean;
}

export interface UserUnitAssignmentRequest {
  unitId: number;
  role: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  units: UserUnit[];
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface UserCreateRequest {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  phone?: string;
  unitAssignments?: UserUnitAssignmentRequest[];
  roles?: string[];
}

export interface UserUpdateRequest {
  email: string;
  fullName?: string;
  phone?: string;
  isActive: boolean;
  unitAssignments?: UserUnitAssignmentRequest[];
  roles?: string[];
}

export interface UserListResponse {
  items: User[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}