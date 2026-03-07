using IPManagement.API.Data;
using IPManagement.API.DTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public interface IRoleService
    {
        Task<IEnumerable<RoleDto>> GetAllRolesAsync();
        Task<RoleDto?> GetRoleByIdAsync(string roleId);
        Task<RoleDto?> CreateRoleAsync(CreateRoleRequest request);
        Task<bool> UpdateRoleAsync(string roleId, UpdateRoleRequest request);
        Task<bool> DeleteRoleAsync(string roleId);
        Task<IEnumerable<RoleDto>> GetUserRolesAsync(string userId);
        Task<bool> AssignRoleToUserAsync(string userId, string roleName);
        Task<bool> RemoveRoleFromUserAsync(string userId, string roleName);
    }

    public class RoleService : IRoleService
    {
        private readonly ApplicationDbContext _context;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly UserManager<Models.ApplicationUser> _userManager;

        public RoleService(
            ApplicationDbContext context,
            RoleManager<IdentityRole> roleManager,
            UserManager<Models.ApplicationUser> userManager)
        {
            _context = context;
            _roleManager = roleManager;
            _userManager = userManager;
        }

        public async Task<IEnumerable<RoleDto>> GetAllRolesAsync()
        {
            var roles = await _roleManager.Roles.ToListAsync();
            var roleDtos = new List<RoleDto>();

            foreach (var role in roles)
            {
                var userCount = await _userManager.GetUsersInRoleAsync(role.Name);
                roleDtos.Add(new RoleDto
                {
                    Id = role.Id,
                    Name = role.Name ?? string.Empty,
                    Description = role.Name switch
                    {
                        "Admin" => "Có toàn quyền quản lý hệ thống",
                        "UnitAdmin" => "Quản lý IP addresses của đơn vị",
                        "User" => "Chỉ có quyền xem",
                        _ => null
                    },
                    UserCount = userCount.Count
                });
            }

            return roleDtos;
        }

        public async Task<RoleDto?> GetRoleByIdAsync(string roleId)
        {
            var role = await _roleManager.FindByIdAsync(roleId);
            if (role == null)
                return null;

            var userCount = await _userManager.GetUsersInRoleAsync(role.Name);
            return new RoleDto
            {
                Id = role.Id,
                Name = role.Name ?? string.Empty,
                Description = role.Name switch
                {
                    "Admin" => "Có toàn quyền quản lý hệ thống",
                    "UnitAdmin" => "Quản lý IP addresses của đơn vị",
                    "User" => "Chỉ có quyền xem",
                    _ => null
                },
                UserCount = userCount.Count
            };
        }

        public async Task<RoleDto?> CreateRoleAsync(CreateRoleRequest request)
        {
            if (await _roleManager.FindByNameAsync(request.Name) != null)
                return null;

            var role = new IdentityRole { Name = request.Name };
            var result = await _roleManager.CreateAsync(role);

            if (!result.Succeeded)
                return null;

            return new RoleDto
            {
                Id = role.Id,
                Name = role.Name ?? string.Empty,
                Description = request.Description,
                UserCount = 0
            };
        }

        public async Task<bool> UpdateRoleAsync(string roleId, UpdateRoleRequest request)
        {
            var role = await _roleManager.FindByIdAsync(roleId);
            if (role == null)
                return false;

            // Lưu ý: ASP.NET Identity không hỗ trợ đổi tên role trực tiếp
            // Chúng ta chỉ có thể cập nhật mô tả (nếu có trường description)
            // Ở đây, chúng ta không có trường description trong IdentityRole
            // Nên chỉ cho phép update nếu cần mở rộng model

            return true;
        }

        public async Task<bool> DeleteRoleAsync(string roleId)
        {
            var role = await _roleManager.FindByIdAsync(roleId);
            if (role == null)
                return false;

            // Không cho phép xóa các role mặc định
            if (role.Name is "Admin" or "UnitAdmin" or "User")
                return false;

            var result = await _roleManager.DeleteAsync(role);
            return result.Succeeded;
        }

        public async Task<IEnumerable<RoleDto>> GetUserRolesAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Enumerable.Empty<RoleDto>();

            var roles = await _userManager.GetRolesAsync(user);
            return roles.Select(r => new RoleDto
            {
                Id = string.Empty,
                Name = r,
                Description = r switch
                {
                    "Admin" => "Có toàn quyền quản lý hệ thống",
                    "UnitAdmin" => "Quản lý IP addresses của đơn vị",
                    "User" => "Chỉ có quyền xem",
                    _ => null
                },
                UserCount = 0
            });
        }

        public async Task<bool> AssignRoleToUserAsync(string userId, string roleName)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return false;

            var roleExists = await _roleManager.RoleExistsAsync(roleName);
            if (!roleExists)
                return false;

            var result = await _userManager.AddToRoleAsync(user, roleName);
            return result.Succeeded;
        }

        public async Task<bool> RemoveRoleFromUserAsync(string userId, string roleName)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return false;

            var result = await _userManager.RemoveFromRoleAsync(user, roleName);
            return result.Succeeded;
        }
    }
}