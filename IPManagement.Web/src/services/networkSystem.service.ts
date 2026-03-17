import api from './api';
import type { 
  NetworkSystem, 
  NetworkSystemCreateRequest, 
  NetworkSystemUpdateRequest, 
  NetworkSystemListResponse,
  AssignIpAddressRequest,
  RemoveIpAddressRequest
} from '../types/networkSystem';

export const networkSystemService = {
  getNetworkSystems: async (
    pageNumber: number = 1,
    pageSize: number = 10,
    searchTerm?: string,
    status?: string
  ): Promise<NetworkSystemListResponse> => {
    const params = new URLSearchParams();
    params.set('pageNumber', pageNumber.toString());
    params.set('pageSize', pageSize.toString());
    if (searchTerm) params.set('searchTerm', searchTerm);
    if (status) params.set('status', status);

    const response = await api.get<NetworkSystemListResponse>(`/NetworkSystems?${params}`);
    return response.data;
  },

  getNetworkSystemById: async (id: number): Promise<NetworkSystem> => {
    const response = await api.get<NetworkSystem>(`/NetworkSystems/${id}`);
    return response.data;
  },

  createNetworkSystem: async (data: NetworkSystemCreateRequest): Promise<NetworkSystem> => {
    const response = await api.post<NetworkSystem>('/NetworkSystems', data);
    return response.data;
  },

  updateNetworkSystem: async (id: number, data: NetworkSystemUpdateRequest): Promise<NetworkSystem> => {
    const response = await api.put<NetworkSystem>(`/NetworkSystems/${id}`, data);
    return response.data;
  },

  deleteNetworkSystem: async (id: number): Promise<void> => {
    await api.delete(`/NetworkSystems/${id}`);
  },

  getAvailableIpAddresses: async (systemId: number): Promise<NetworkSystem[]> => {
    const response = await api.get<NetworkSystem[]>(`/NetworkSystems/${systemId}/available-ips`);
    return response.data;
  },

  getNetworkSystemsByIpAddress: async (ipId: number): Promise<NetworkSystem[]> => {
    const response = await api.get<NetworkSystem[]>(`/NetworkSystems/ip-address/${ipId}`);
    return response.data;
  },

  assignIpAddress: async (request: AssignIpAddressRequest): Promise<void> => {
    await api.post('/NetworkSystems/assign-ip', request);
  },

  removeIpAddress: async (request: RemoveIpAddressRequest): Promise<void> => {
    await api.post('/NetworkSystems/remove-ip', request);
  },
};