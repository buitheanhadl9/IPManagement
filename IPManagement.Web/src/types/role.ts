export interface Role {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name: string;
  description?: string;
}

export interface AssignRoleToUserRequest {
  roleName: string;
}

export interface RemoveRoleFromUserRequest {
  roleName: string;
}