using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.Models
{
    public class NetworkSystem
    {
        public long Id { get; set; }
        
        public Guid ExternalId { get; set; } = Guid.NewGuid();
        
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string? Code { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [StringLength(20)]
        public string Status { get; set; } = "Active";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        public string? CreatedBy { get; set; }
        
        public ApplicationUser? CreatedByUser { get; set; }
        
        public string? UpdatedBy { get; set; }
        
        public ApplicationUser? UpdatedByUser { get; set; }
        
        // Many-to-many relationship with IP addresses
        public ICollection<NetworkSystemIpAddress> IpAddresses { get; set; } = new List<NetworkSystemIpAddress>();
    }
}