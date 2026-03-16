using IPManagement.API.Data;
using IPManagement.API.DTOs;
using IPManagement.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using IPManagement.API.Authorization;

namespace IPManagement.API.Services
{
    public class DrawingService : IDrawingService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<DrawingService> _logger;
        private readonly IConfiguration _configuration;
        private readonly string _uploadPath;
        private readonly long _maxFileSize;
        private readonly string[] _allowedExtensions;

        public DrawingService(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            ILogger<DrawingService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
            _configuration = configuration;
            
            _uploadPath = _configuration.GetValue<string>("FileStorage:DrawingUploadPath") ?? "uploads/drawings";
            _maxFileSize = _configuration.GetValue<long?>("FileStorage:MaxFileSize") ?? 52428800L;
            _allowedExtensions = _configuration.GetSection("FileStorage:AllowedExtensions").Get<string[]>()
                ?? new[] { ".pdf", ".dwg", ".png", ".jpg", ".jpeg", ".vsdx" };
        }

        public async Task<DrawingDto[]> GetAllDrawingsAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return Array.Empty<DrawingDto>();

            var isAdmin = await IsAdminAsync(user);
            if (isAdmin)
            {
                var allDrawings = await _context.Drawings
                    .Include(d => d.Unit)
                    .Include(d => d.CreatedByUser)
                    .OrderByDescending(d => d.CreatedAt)
                    .ToListAsync();

                return allDrawings.Select(d => ToDto(d, null)).ToArray();
            }

            var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
            if (assignedUnitIds.Length == 0)
                return Array.Empty<DrawingDto>();

            var drawings = await _context.Drawings
                .Include(d => d.Unit)
                .Include(d => d.CreatedByUser)
                .Where(d => assignedUnitIds.Contains(d.UnitId))
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return drawings.Select(d => ToDto(d, null)).ToArray();
        }

        public async Task<DrawingDto[]> GetDrawingsByUnitAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return Array.Empty<DrawingDto>();

            // Check permission
            if (!await HasPermissionAsync(user, Permissions.DrawingRead))
                return Array.Empty<DrawingDto>();

            var isAdmin = await IsAdminAsync(user);
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (!assignedUnitIds.Contains(unitId))
                    return Array.Empty<DrawingDto>();
            }

            var unit = await _context.Units.FindAsync(unitId);
            if (unit == null)
                return Array.Empty<DrawingDto>();

            var drawings = await _context.Drawings
                .Include(d => d.CreatedByUser)
                .Where(d => d.UnitId == unitId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return drawings.Select(d => ToDto(d, unit.Name)).ToArray();
        }

        public async Task<DrawingDto?> GetDrawingByIdAsync(Guid userId, long drawingId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return null;

            var drawing = await _context.Drawings
                .Include(d => d.Unit)
                .Include(d => d.CreatedByUser)
                .FirstOrDefaultAsync(d => d.Id == drawingId);

            if (drawing == null)
                return null;

            var isAdmin = await IsAdminAsync(user);
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (!assignedUnitIds.Contains(drawing.UnitId))
                    return null;
            }

            return ToDto(drawing, drawing.Unit?.Name);
        }

        public async Task<DrawingDto> UploadDrawingAsync(Guid userId, DrawingUploadRequest request, IFormFile file)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            if (!await HasPermissionAsync(user, Permissions.DrawingCreate))
                throw new UnauthorizedAccessException("No permission to upload drawings");

            // Validate file
            ValidateFile(file);

            // Check if unit exists
            var unit = await _context.Units.FindAsync(request.UnitId);
            if (unit == null)
                throw new InvalidOperationException("Unit not found");

            var isAdmin = await IsAdminAsync(user);
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (!assignedUnitIds.Contains(request.UnitId))
                    throw new UnauthorizedAccessException("You do not have access to this unit");
            }

            // Create directory if not exists
            var unitDir = Path.Combine(_uploadPath, request.UnitId.ToString());
            if (!Directory.Exists(unitDir))
                Directory.CreateDirectory(unitDir);

            // Generate file name
            var drawingId = Guid.NewGuid();
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName = $"{drawingId}{extension}";
            var filePath = Path.Combine(unitDir, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Create drawing record
            var drawing = new Drawing
            {
                Id = GetNextId(),
                UnitId = request.UnitId,
                FileName = file.FileName,
                FilePath = filePath,
                FileType = extension.Substring(1).ToUpperInvariant(),
                FileSize = file.Length,
                Version = request.Version,
                Description = request.Description,
                CreatedBy = userId.ToString(),
                CreatedAt = DateTime.UtcNow
            };

            _context.Drawings.Add(drawing);
            await _context.SaveChangesAsync();

            return ToDto(drawing, unit.Name);
        }

        public async Task<DrawingDto> UpdateDrawingAsync(Guid userId, long drawingId, DrawingUpdateRequest request)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            if (!await HasPermissionAsync(user, Permissions.DrawingUpdate))
                throw new UnauthorizedAccessException("No permission to update drawings");

            var drawing = await _context.Drawings
                .Include(d => d.Unit)
                .FirstOrDefaultAsync(d => d.Id == drawingId);

            if (drawing == null)
                throw new InvalidOperationException("Drawing not found");

            var isAdmin = await IsAdminAsync(user);
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (!assignedUnitIds.Contains(drawing.UnitId))
                    throw new UnauthorizedAccessException("You do not have access to this unit");
            }

            drawing.Version = request.Version;
            drawing.Description = request.Description;
            drawing.UpdatedAt = DateTime.UtcNow;
            drawing.UpdatedBy = userId.ToString();

            await _context.SaveChangesAsync();

            return ToDto(drawing, drawing.Unit?.Name);
        }

        public async Task<DrawingDto> UpdateDrawingFileAsync(Guid userId, long drawingId, IFormFile file, string? version)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            if (!await HasPermissionAsync(user, Permissions.DrawingUpdate))
                throw new UnauthorizedAccessException("No permission to update drawings");

            ValidateFile(file);

            var drawing = await _context.Drawings
                .Include(d => d.Unit)
                .FirstOrDefaultAsync(d => d.Id == drawingId);

            if (drawing == null)
                throw new InvalidOperationException("Drawing not found");

            var isAdmin = await IsAdminAsync(user);
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (!assignedUnitIds.Contains(drawing.UnitId))
                    throw new UnauthorizedAccessException("You do not have access to this unit");
            }

            // Delete old file
            if (File.Exists(drawing.FilePath))
                File.Delete(drawing.FilePath);

            // Create directory if not exists
            var unitDir = Path.Combine(_uploadPath, drawing.UnitId.ToString());
            if (!Directory.Exists(unitDir))
                Directory.CreateDirectory(unitDir);

            // Generate new file name with version
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var newFileName = $"{drawing.Id}{(string.IsNullOrEmpty(version) ? "" : $"_{version}")}{extension}";
            var newFilePath = Path.Combine(unitDir, newFileName);

            // Save new file
            using (var stream = new FileStream(newFilePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Update drawing record
            drawing.FileName = file.FileName;
            drawing.FilePath = newFilePath;
            drawing.FileType = extension.Substring(1).ToUpperInvariant();
            drawing.FileSize = file.Length;
            drawing.Version = version ?? drawing.Version;
            drawing.UpdatedAt = DateTime.UtcNow;
            drawing.UpdatedBy = userId.ToString();

            await _context.SaveChangesAsync();

            return ToDto(drawing, drawing.Unit?.Name);
        }

        public async Task<bool> DeleteDrawingAsync(Guid userId, long drawingId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            if (!await HasPermissionAsync(user, Permissions.DrawingDelete))
                throw new UnauthorizedAccessException("No permission to delete drawings");

            var drawing = await _context.Drawings
                .Include(d => d.Unit)
                .FirstOrDefaultAsync(d => d.Id == drawingId);

            if (drawing == null)
                throw new InvalidOperationException("Drawing not found");

            var isAdmin = await IsAdminAsync(user);
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (!assignedUnitIds.Contains(drawing.UnitId))
                    throw new UnauthorizedAccessException("You do not have access to this unit");
            }

            // Delete file
            if (File.Exists(drawing.FilePath))
                File.Delete(drawing.FilePath);

            _context.Drawings.Remove(drawing);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<FileStreamResult> DownloadDrawingAsync(Guid userId, long drawingId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            var drawing = await _context.Drawings
                .Include(d => d.Unit)
                .FirstOrDefaultAsync(d => d.Id == drawingId);

            if (drawing == null)
                throw new InvalidOperationException("Drawing not found");

            var isAdmin = await IsAdminAsync(user);
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (!assignedUnitIds.Contains(drawing.UnitId))
                    throw new UnauthorizedAccessException("You do not have access to this unit");
            }

            if (!File.Exists(drawing.FilePath))
                throw new FileNotFoundException("File not found");

            var fileStream = new FileStream(drawing.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return new FileStreamResult(fileStream, GetContentType(drawing.FileType))
            {
                FileDownloadName = drawing.FileName
            };
        }

        public async Task<FileResult> PreviewDrawingAsync(Guid userId, long drawingId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            var drawing = await _context.Drawings
                .Include(d => d.Unit)
                .FirstOrDefaultAsync(d => d.Id == drawingId);

            if (drawing == null)
                throw new InvalidOperationException("Drawing not found");

            var isAdmin = await IsAdminAsync(user);
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (!assignedUnitIds.Contains(drawing.UnitId))
                    throw new UnauthorizedAccessException("You do not have access to this unit");
            }

            // Only allow preview for PDF, PNG, JPG
            if (drawing.FileType != "PDF" && drawing.FileType != "PNG" && drawing.FileType != "JPG")
                throw new InvalidOperationException("Preview not supported for this file type");

            if (!File.Exists(drawing.FilePath))
                throw new FileNotFoundException("File not found");

            var fileStream = new FileStream(drawing.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return new FileStreamResult(fileStream, GetContentType(drawing.FileType));
        }

        #region Helper Methods

        private DrawingDto ToDto(Drawing drawing, string? unitName)
        {
            var previewUrl = null as string;
            if (drawing.FileType == "PDF" || drawing.FileType == "PNG" || drawing.FileType == "JPG")
            {
                previewUrl = $"/api/drawings/{drawing.Id}/preview";
            }

            return new DrawingDto
            {
                Id = drawing.Id,
                ExternalId = drawing.ExternalId,
                UnitId = drawing.UnitId,
                UnitName = unitName ?? drawing.Unit?.Name ?? string.Empty,
                FileName = drawing.FileName,
                FileType = drawing.FileType,
                FileSize = drawing.FileSize,
                Version = drawing.Version,
                Description = drawing.Description,
                CreatedBy = drawing.CreatedBy,
                CreatedAt = drawing.CreatedAt,
                UpdatedBy = drawing.UpdatedBy,
                UpdatedAt = drawing.UpdatedAt,
                PreviewUrl = previewUrl
            };
        }

        private void ValidateFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("No file provided");

            if (file.Length > _maxFileSize)
                throw new InvalidOperationException($"File size exceeds maximum allowed ({_maxFileSize / (1024 * 1024)}MB)");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_allowedExtensions.Contains(extension))
                throw new InvalidOperationException($"File type '{extension}' is not allowed");
        }

        private string GetContentType(string fileType)
        {
            return fileType switch
            {
                "PDF" => "application/pdf",
                "PNG" => "image/png",
                "JPG" => "image/jpeg",
                "DWG" => "application/vnd.autocad",
                "VSDX" => "application/vnd.visio",
                _ => "application/octet-stream"
            };
        }

        private long GetNextId()
        {
            var maxId = _context.Drawings.Any() ? _context.Drawings.Max(d => d.Id) : 0;
            return maxId + 1;
        }

        private async Task<long[]> GetAssignedUnitIdsAsync(Guid userId)
        {
            var assignments = await _context.UserUnitAssignments
                .Where(u => u.UserId == userId.ToString())
                .Select(u => u.UnitId)
                .ToListAsync();
            return assignments.ToArray();
        }

        private async Task<bool> HasPermissionAsync(ApplicationUser user, string permission)
        {
            var roles = await _userManager.GetRolesAsync(user);
            return await _context.RolePermissions
                .AnyAsync(rp =>
                    roles.Contains(rp.RoleName) &&
                    rp.Permission == permission);
        }

        private async Task<bool> IsAdminAsync(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            return roles.Contains("Admin");
        }

        #endregion
    }
}