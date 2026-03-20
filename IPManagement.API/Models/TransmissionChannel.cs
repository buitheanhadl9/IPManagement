using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.Models
{
    public class TransmissionChannel
    {
        public long Id { get; set; }
        
        public Guid ExternalId { get; set; } = Guid.NewGuid();
        
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Provider { get; set; } = string.Empty;
        
        public int Bandwidth { get; set; }
        
        public int VlanId { get; set; }
        
        [Required]
        [StringLength(50)]
        public string IpRangeStart { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string IpRangeEnd { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Subnet { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Gateway { get; set; } = string.Empty;
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        public ICollection<UnitTransmissionChannel> UnitAssignments { get; set; } = new List<UnitTransmissionChannel>();
    }
}