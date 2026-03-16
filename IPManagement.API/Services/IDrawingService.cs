using IPManagement.API.DTOs;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public interface IDrawingService
    {
        Task<DrawingDto[]> GetAllDrawingsAsync(Guid userId);
        Task<DrawingDto[]> GetDrawingsByUnitAsync(Guid userId, long unitId);
        Task<DrawingDto?> GetDrawingByIdAsync(Guid userId, long drawingId);
        Task<DrawingDto> UploadDrawingAsync(Guid userId, DrawingUploadRequest request, IFormFile file);
        Task<DrawingDto> UpdateDrawingAsync(Guid userId, long drawingId, DrawingUpdateRequest request);
        Task<DrawingDto> UpdateDrawingFileAsync(Guid userId, long drawingId, IFormFile file, string? version);
        Task<bool> DeleteDrawingAsync(Guid userId, long drawingId);
        Task<FileStreamResult> DownloadDrawingAsync(Guid userId, long drawingId);
        Task<FileResult> PreviewDrawingAsync(Guid userId, long drawingId);
    }
}