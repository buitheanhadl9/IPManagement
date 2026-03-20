import api from './api';
import type {
  TransmissionChannel,
  TransmissionChannelCreateRequest,
  TransmissionChannelUpdateRequest,
} from '../types/transmissionChannel';

export const transmissionChannelService = {
  getAll: async () => {
    const response = await api.get<TransmissionChannel[]>('/TransmissionChannels');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<TransmissionChannel>(`/TransmissionChannels/${id}`);
    return response.data;
  },

  getByUnit: async (unitId: number) => {
    const response = await api.get<TransmissionChannel[]>(`/TransmissionChannels/unit/${unitId}`);
    return response.data;
  },

  create: async (data: TransmissionChannelCreateRequest) => {
    const response = await api.post<TransmissionChannel>('/TransmissionChannels', data);
    return response.data;
  },

  update: async (id: number, data: TransmissionChannelUpdateRequest) => {
    const response = await api.put<TransmissionChannel>(`/TransmissionChannels/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/TransmissionChannels/${id}`);
  },
};