using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.DTOs
{
    public class TransmissionChannelCreateRequest
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Provider { get; set; } = string.Empty;
        
        [Required]
        public int Bandwidth { get; set; }
        
        [Required]
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
        
        public long[]? UnitIds { get; set; }
    }

    public class TransmissionChannelUpdateRequest
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Provider { get; set; } = string.Empty;
        
        [Required]
        public int Bandwidth { get; set; }
        
        [Required]
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
        
        public bool IsActive { get; set; }
        
        public long[]? UnitIds { get; set; }
    }

    public class TransmissionChannelDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public int Bandwidth { get; set; }
        public int VlanId { get; set; }
        public string IpRangeStart { get; set; } = string.Empty;
        public string IpRangeEnd { get; set; } = string.Empty;
        public string Subnet { get; set; } = string.Empty;
        public string Gateway { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int UnitCount { get; set; }
        public UnitSelectionDto[] Units { get; set; } = Array.Empty<UnitSelectionDto>();
    }

    public class UnitTransmissionChannelDto
    {
        public long Id { get; set; }
        public long UnitId { get; set; }
        public string UnitName { get; set; } = string.Empty;
        public long ChannelId { get; set; }
        public string ChannelCode { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
        public string? AssignedBy { get; set; }
    }
}