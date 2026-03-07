using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;

namespace IPManagement.API.Models
{
    public class ApplicationUser : IdentityUser
    {
        public long? UnitId { get; set; }
        
        public Unit? Unit { get; set; }
        
        public string? FullName { get; set; }
        
        public string? Phone { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        public DateTime? LastLogin { get; set; }
        
        public ICollection<IPAddressRecord> CreatedIPAddresses { get; set; } = new List<IPAddressRecord>();
        
        public ICollection<IPAddressRecord> UpdatedIPAddresses { get; set; } = new List<IPAddressRecord>();
        
        public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
        
        public ICollection<UserUnitAssignment> UserUnitAssignments { get; set; } = new List<UserUnitAssignment>();
    }
}