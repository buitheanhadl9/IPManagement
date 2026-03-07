using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.DTOs
{
    public class UnitCreateRequest
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Code { get; set; }

        [StringLength(500)]
        public string? Address { get; set; }

        public long? ParentUnitId { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(1000)]
        public string? Note { get; set; }
    }

    public class UnitUpdateRequest
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Code { get; set; }

        [StringLength(500)]
        public string? Address { get; set; }

        public long? ParentUnitId { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(1000)]
        public string? Note { get; set; }

        public bool IsActive { get; set; }
    }

    public class UnitDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Address { get; set; }
        public long? ParentUnitId { get; set; }
        public string? ParentUnitName { get; set; }
        public string? Description { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsActive { get; set; }
        public UnitDto[]? ChildUnits { get; set; }
        public int IPAddressCount { get; set; }
    }

    public class UnitTreeDto
    {
            public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public UnitTreeDto[]? ChildUnits { get; set; }
        public int IPAddressCount { get; set; }
    }

    public class UnitSelectionDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
    }
}