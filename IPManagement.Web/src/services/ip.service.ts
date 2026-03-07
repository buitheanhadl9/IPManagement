import api from './api';
import type { IPAddress, IPAddressCreateRequest, IPAddressUpdateRequest, IPAddressListResponse, CheckIPStatusRequest } from '../types/ip';

export const ipService = {
  getIPAddresses: async (
    pageNumber: number = 1,
    pageSize: number = 10,
    searchTerm?: string,
    unitId?: number,
    status?: string
  ): Promise<IPAddressListResponse> => {
    const params = new URLSearchParams();
    params.set('pageNumber', pageNumber.toString());
    params.set('pageSize', pageSize.toString());
    if (searchTerm) params.set('searchTerm', searchTerm);
    if (unitId) params.set('unitId', unitId.toString());
    if (status) params.set('status', status);

    const response = await api.get<IPAddressListResponse>(`/IPAddresses?${params}`);
    return response.data;
  },

  getIPAddressById: async (id: number): Promise<IPAddress> => {
    const response = await api.get<IPAddress>(`/IPAddresses/${id}`);
    return response.data;
  },

  createIPAddress: async (data: IPAddressCreateRequest): Promise<IPAddress> => {
    const response = await api.post<IPAddress>('/IPAddresses', data);
    return response.data;
  },

  updateIPAddress: async (id: number, data: IPAddressUpdateRequest): Promise<IPAddress> => {
    const response = await api.put<IPAddress>(`/IPAddresses/${id}`, data);
    return response.data;
  },

  deleteIPAddress: async (id: number): Promise<void> => {
    await api.delete(`/IPAddresses/${id}`);
  },

  checkStatus: async (request: CheckIPStatusRequest): Promise<IPAddress[]> => {
    const response = await api.post<IPAddress[]>('/IPAddresses/check-status', request);
    return response.data;
  },

  getDuplicates: async (): Promise<IPAddress[]> => {
    const response = await api.get<IPAddress[]>('/IPAddresses/duplicates');
    return response.data;
  },
};