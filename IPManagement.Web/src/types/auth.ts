export interface UserUnit {
  id: number;
  name: string;
  role: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  unitId?: number;
  unitName?: string;
  units?: UserUnit[];
  roles: string[];
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}