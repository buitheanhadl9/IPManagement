using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.Models
{
    public class IPAddressRecord
    {
        public long Id { get; set; }
        
        public Guid ExternalId { get; set; } = Guid.NewGuid();
        
        public long UnitId { get; set; }
        
        public Unit? Unit { get; set; }
        
        [Required]
        [StringLength(45)]
        public string IpAddress { get; set; } = string.Empty;
        
        [StringLength(17)]
        public string? MacAddress { get; set; }
        
        [StringLength(200)]
        public string? DeviceName { get; set; }
        
        [StringLength(100)]
        public string? DeviceType { get; set; }
        
        [StringLength(50)]
        public string? Port { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [StringLength(20)]
        public string Status { get; set; } = "active";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        public string? CreatedBy { get; set; }
        
        public ApplicationUser? CreatedByUser { get; set; }
        
        public string? UpdatedBy { get; set; }
        
        public ApplicationUser? UpdatedByUser { get; set; }
        
        public bool IsOnline { get; set; } = false;
        
        public DateTime? LastPingTime { get; set; }
    }
}