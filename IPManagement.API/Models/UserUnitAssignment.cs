using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IPManagement.API.Models
{
    public class UserUnitAssignment
    {
        public long Id { get; set; }
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [ForeignKey(nameof(UserId))]
        public ApplicationUser User { get; set; } = null!;
        
        [Required]
        public long UnitId { get; set; }
        
        [ForeignKey(nameof(UnitId))]
        public Unit Unit { get; set; } = null!;
        
        [Required]
        [StringLength(50)]
        public string Role { get; set; } = "User";  // Admin, UnitAdmin, User
        
        public bool IsPrimary { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}