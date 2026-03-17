using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.Models
{
    /// <summary>
    /// Join table for many-to-many relationship between NetworkSystem and IPAddress
    /// </summary>
    public class NetworkSystemIpAddress
    {
        public long NetworkSystemId { get; set; }
        public NetworkSystem? NetworkSystem { get; set; }
        
        public long IpAddressId { get; set; }
        public IPAddressRecord? IpAddress { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public string? CreatedBy { get; set; }
        
        public ApplicationUser? CreatedByUser { get; set; }
    }
}