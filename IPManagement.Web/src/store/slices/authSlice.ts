import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';
import type { User, LoginRequest, AuthState } from '../../types/auth';
import type { PermissionUpdateNotification } from '../../types/notification';

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  lastActivity: localStorage.getItem('lastActivity') ? parseInt(localStorage.getItem('lastActivity')!) : null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('token', response.token);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('lastActivity');
});

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

/**
 * Thunk để xử lý permissions update notification
 * Nếu user có role bị thay đổi permissions, sẽ fetch lại profile
 */
export const handlePermissionsUpdate = (notification: PermissionUpdateNotification) => {
  return async (dispatch: any, getState: any) => {
    const state = getState();
    const user = state.auth.user;
    
    // Kiểm tra nếu user có role trong notification, thì fetch lại profile
    if (user && user.roles?.includes(notification.roleName)) {
      console.log('[authSlice] User has role that was updated, fetching new profile...');
      dispatch(fetchProfile());
    }
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateLastActivity: (state, action: PayloadAction<number>) => {
      state.lastActivity = action.payload;
      // Lưu vào localStorage để persist
      localStorage.setItem('lastActivity', action.payload.toString());
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.lastActivity = Date.now();
        localStorage.setItem('lastActivity', Date.now().toString());
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Fetch Profile
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        // Map backend response (Permissions, Roles) to frontend format (permissions, roles)
        const userData: User = {
          ...action.payload,
          permissions: action.payload.Permissions || action.payload.permissions,
          roles: action.payload.Roles || action.payload.roles,
          units: action.payload.Units || action.payload.units,
        };
        state.user = userData;
        state.isAuthenticated = true;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      });
  },
});

export const { clearError, updateLastActivity } = authSlice.actions;
export default authSlice.reducer;