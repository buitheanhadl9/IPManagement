using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.Models
{
    public class AuditLog
    {
        public long Id { get; set; }
        
        public string? UserId { get; set; }
        
        public ApplicationUser? User { get; set; }
        
        [Required]
        [StringLength(20)]
        public string Action { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string EntityType { get; set; } = string.Empty;
        
        public long? EntityId { get; set; }
        
        public string? OldValue { get; set; }
        
        public string? NewValue { get; set; }
        
        [StringLength(45)]
        public string? IpAddress { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}