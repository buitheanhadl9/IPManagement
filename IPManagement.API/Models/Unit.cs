using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.Models
{
    public class Unit
    {
        public long Id { get; set; }
        
        public Guid ExternalId { get; set; } = Guid.NewGuid();
        
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string? Code { get; set; }
        
        [StringLength(500)]
        public string? Address { get; set; }
        
        public long? ParentUnitId { get; set; }
        
        public Unit? ParentUnit { get; set; }
        
        public ICollection<Unit> ChildUnits { get; set; } = new List<Unit>();
        
        public ICollection<IPAddressRecord> IPAddresses { get; set; } = new List<IPAddressRecord>();
        
        public ICollection<UserUnitAssignment> UserUnitAssignments { get; set; } = new List<UserUnitAssignment>();
        
        public ICollection<Drawing> Drawings { get; set; } = new List<Drawing>();
        
        [StringLength(1000)]
        public string? Description { get; set; }
        
        [StringLength(1000)]
        public string? Note { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        public bool IsActive { get; set; } = true;
    }
}