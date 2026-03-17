using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.DTOs
{
    public class NetworkSystemCreateRequest
    {
        [Required]
        [StringLength(200, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string? Code { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [StringLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class NetworkSystemUpdateRequest
    {
        [StringLength(200, MinimumLength = 1)]
        public string? Name { get; set; }
        
        [StringLength(50)]
        public string? Code { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [StringLength(20)]
        public string? Status { get; set; }
    }

    public class NetworkSystemDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public string? UpdatedBy { get; set; }
        public IPAddressDto[] IpAddresses { get; set; } = Array.Empty<IPAddressDto>();
    }

    public class NetworkSystemListResponse
    {
        public NetworkSystemDto[] Items { get; set; } = Array.Empty<NetworkSystemDto>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
    }

    public class AssignIpAddressRequest
    {
        [Required]
        public long NetworkSystemId { get; set; }
        
        [Required]
        public long IpAddressId { get; set; }
    }

    public class RemoveIpAddressRequest
    {
        [Required]
        public long NetworkSystemId { get; set; }
        
        [Required]
        public long IpAddressId { get; set; }
    }
}