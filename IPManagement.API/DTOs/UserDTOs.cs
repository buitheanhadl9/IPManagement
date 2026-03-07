using System;
using System.ComponentModel.DataAnnotations;

namespace IPManagement.API.DTOs
{
    public class UserUnitAssignmentRequest
    {
        public long UnitId { get; set; }
        public string Role { get; set; } = "User";
        public bool IsPrimary { get; set; }
    }

    public class UserCreateRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string Username { get; set; } = string.Empty;

        public string? FullName { get; set; }

        public string? Phone { get; set; }

        public UserUnitAssignmentRequest[]? UnitAssignments { get; set; }

        public string[]? Roles { get; set; }
    }

    public class UserUpdateRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? FullName { get; set; }

        public string? Phone { get; set; }

        public bool IsActive { get; set; }

        public UserUnitAssignmentRequest[]? UnitAssignments { get; set; }

        public string[]? Roles { get; set; }
    }

    public class UserUnitDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public bool IsPrimary { get; set; }
    }

    public class UserDetailDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public UserUnitDto[] Units { get; set; } = Array.Empty<UserUnitDto>();
        public string[] Roles { get; set; } = Array.Empty<string>();
        public string[] Permissions { get; set; } = Array.Empty<string>();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? LastLogin { get; set; }
    }

    public class UserListDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? UnitName { get; set; }
        public UserUnitDto[] Units { get; set; } = Array.Empty<UserUnitDto>();
        public string[] Roles { get; set; } = Array.Empty<string>();
        public string[] Permissions { get; set; } = Array.Empty<string>();
        public bool IsActive { get; set; }
        public DateTime? LastLogin { get; set; }
    }

    public class UserListResponse
    {
        public UserListDto[] Items { get; set; } = Array.Empty<UserListDto>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
    }

    // Role DTOs
    public class RoleDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int UserCount { get; set; }
    }

    public class CreateRoleRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class UpdateRoleRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class AssignRoleToUserRequest
    {
        [Required]
        public string RoleName { get; set; } = string.Empty;
    }

    public class RemoveRoleFromUserRequest
    {
        [Required]
        public string RoleName { get; set; } = string.Empty;
    }
}