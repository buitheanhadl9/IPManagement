import api from './api';
import type { Unit, UnitTree, UnitCreateRequest, UnitUpdateRequest } from '../types/unit';

export const unitService = {
  getAllUnits: async (): Promise<Unit[]> => {
    const response = await api.get<Unit[]>('/units');
    return response.data;
  },

  getUnitTree: async (): Promise<UnitTree[]> => {
    const response = await api.get<UnitTree[]>('/units/tree');
    return response.data;
  },

  getUnitById: async (id: number): Promise<Unit> => {
    const response = await api.get<Unit>(`/units/${id}`);
    return response.data;
  },

  getMyUnit: async (): Promise<Unit> => {
    const response = await api.get<Unit>('/units/my-unit');
    return response.data;
  },

  createUnit: async (data: UnitCreateRequest): Promise<Unit> => {
    const response = await api.post<Unit>('/units', data);
    return response.data;
  },

  updateUnit: async (id: number, data: UnitUpdateRequest): Promise<Unit> => {
    const response = await api.put<Unit>(`/units/${id}`, data);
    return response.data;
  },

  deleteUnit: async (id: number): Promise<void> => {
    await api.delete(`/units/${id}`);
  },
};