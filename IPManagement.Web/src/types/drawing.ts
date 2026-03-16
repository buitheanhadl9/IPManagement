export interface Drawing {
  id: number;
  externalId: string;
  unitId: number;
  unitName: string;
  fileName: string;
  fileType: string;  // PDF, DWG, PNG, JPG, VSDX
  fileSize: number;
  version?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  previewUrl?: string;
}

export interface DrawingUploadRequest {
  unitId: number;
  version?: string;
  description?: string;
}

export interface DrawingUpdateRequest {
  version?: string;
  description?: string;
}