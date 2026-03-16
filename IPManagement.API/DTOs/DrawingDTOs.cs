using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.DTOs
{
    // Tạo mới (upload)
    public class DrawingUploadRequest
    {
        public long UnitId { get; set; }
        
        [StringLength(50)]
        public string? Version { get; set; }
        
        [StringLength(1000)]
        public string? Description { get; set; }
    }

    // Response
    public class DrawingDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public long UnitId { get; set; }
        public string UnitName { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string? Version { get; set; }
        public string? Description { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? PreviewUrl { get; set; }
    }

    // Cập nhật thông tin
    public class DrawingUpdateRequest
    {
        [StringLength(50)]
        public string? Version { get; set; }
        
        [StringLength(1000)]
        public string? Description { get; set; }
    }

    // Upload file mới cho bản vẽ đã tồn tại
    public class DrawingFileUpdateRequest
    {
        public long DrawingId { get; set; }
        
        [StringLength(50)]
        public string? Version { get; set; }
    }
}