using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.Models
{
    public class Drawing
    {
        public long Id { get; set; }
        
        public Guid ExternalId { get; set; } = Guid.NewGuid();
        
        // Quan hệ với Unit
        public long UnitId { get; set; }
        
        public Unit? Unit { get; set; }
        
        // Thông tin file
        [Required]
        [StringLength(255)]
        public string FileName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(500)]
        public string FilePath { get; set; } = string.Empty;
        
        [Required]
        [StringLength(10)]
        public string FileType { get; set; } = string.Empty;  // PDF, DWG, PNG, JPG, VSDX
        
        public long FileSize { get; set; }  // bytes
        
        // Thông tin bản vẽ
        [StringLength(50)]
        public string? Version { get; set; }  // VD: "1.0", "2.0"
        
        [StringLength(1000)]
        public string? Description { get; set; }
        
        // Audit
        [StringLength(450)]
        public string? CreatedBy { get; set; }
        
        public ApplicationUser? CreatedByUser { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [StringLength(450)]
        public string? UpdatedBy { get; set; }
        
        public ApplicationUser? UpdatedByUser { get; set; }
        
        public DateTime? UpdatedAt { get; set; }
    }
}