using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.DTOs
{
    public class IPAddressCreateRequest
    {
        [Required]
        [RegularExpression(@"^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$", 
            ErrorMessage = "Invalid IPv4 address format")]
        public string IpAddress { get; set; } = string.Empty;

        [RegularExpression(@"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^$", 
            ErrorMessage = "Invalid MAC address format")]
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

        public long? UnitId { get; set; }
    }

    public class IPAddressUpdateRequest
    {
        [Required]
        [RegularExpression(@"^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$", 
            ErrorMessage = "Invalid IPv4 address format")]
        public string IpAddress { get; set; } = string.Empty;

        [RegularExpression(@"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^$", 
            ErrorMessage = "Invalid MAC address format")]
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
    }

    public class IPAddressDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public long UnitId { get; set; }
        public string? UnitName { get; set; }
        public string IpAddress { get; set; } = string.Empty;
        public string? MacAddress { get; set; }
        public string? DeviceName { get; set; }
        public string? DeviceType { get; set; }
        public string? Port { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsOnline { get; set; }
        public DateTime? LastPingTime { get; set; }
    }

    public class IPAddressListResponse
    {
        public IPAddressDto[] Items { get; set; } = Array.Empty<IPAddressDto>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
    }

    public class CheckIPStatusRequest
    {
        public long[]? IpIds { get; set; }
        public string[]? IpAddresses { get; set; }
    }
}