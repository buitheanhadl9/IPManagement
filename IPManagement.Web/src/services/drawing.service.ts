import api from './api';
import type { Drawing, DrawingUploadRequest, DrawingUpdateRequest } from '../types/drawing';

export const drawingService = {
  // Lấy danh sách bản vẽ của đơn vị
  getDrawingsByUnit: async (unitId: number): Promise<Drawing[]> => {
    const response = await api.get<Drawing[]>(`/drawings/unit/${unitId}`);
    return response.data;
  },

  // Upload bản vẽ mới
  uploadDrawing: async (data: FormData): Promise<Drawing> => {
    const response = await api.post<Drawing>('/drawings/upload', data, {
      headers: { 'Content-Type': undefined }
    });
    return response.data;
  },

  // Cập nhật thông tin
  updateDrawing: async (id: number, data: DrawingUpdateRequest): Promise<Drawing> => {
    const response = await api.put<Drawing>(`/drawings/${id}`, data);
    return response.data;
  },

  // Cập nhật file
  updateDrawingFile: async (id: number, file: File, version?: string): Promise<Drawing> => {
    const formData = new FormData();
    formData.append('file', file);
    if (version) formData.append('version', version);
    const response = await api.post<Drawing>(`/drawings/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Xóa bản vẽ
  deleteDrawing: async (id: number): Promise<void> => {
    await api.delete(`/drawings/${id}`);
  },

  // Download file
  downloadDrawing: async (id: number, fileName: string): Promise<void> => {
    const response = await api.get(`/drawings/${id}/download`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  // Lấy URL preview
  getPreviewUrl: async (id: number): Promise<string> => {
    const response = await api.get(`/drawings/${id}/preview`);
    return response.data.previewUrl;
  }
};