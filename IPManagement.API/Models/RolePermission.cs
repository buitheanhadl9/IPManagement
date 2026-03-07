using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.Models
{
    public class RolePermission
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        [MaxLength(100)]
        public string RoleName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Permission { get; set; } = string.Empty;
    }
}