using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;

namespace IPManagement.API.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? FullName { get; set; }
        
        public string? Phone { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        public DateTime? LastLogin { get; set; }
        
        public DateTime? LastActivity { get; set; }
        
        public string? RefreshToken { get; set; }
        
        public DateTime? RefreshTokenExpiry { get; set; }
        
        public ICollection<IPAddressRecord> CreatedIPAddresses { get; set; } = new List<IPAddressRecord>();
        
        public ICollection<IPAddressRecord> UpdatedIPAddresses { get; set; } = new List<IPAddressRecord>();
        
        public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
        
        public ICollection<UserUnitAssignment> UserUnitAssignments { get; set; } = new List<UserUnitAssignment>();
        
        public ICollection<Drawing> CreatedDrawings { get; set; } = new List<Drawing>();
        
        public ICollection<Drawing> UpdatedDrawings { get; set; } = new List<Drawing>();
    }
}