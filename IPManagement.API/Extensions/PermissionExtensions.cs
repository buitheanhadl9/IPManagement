using IPManagement.API.Data;
using IPManagement.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IPManagement.API.Extensions
{
    public static class PermissionExtensions
    {
        /// <summary>
        /// Kiểm tra xem user có permission nào không
        /// </summary>
        public static async Task<bool> HasPermissionAsync(
            this UserManager<ApplicationUser> userManager,
            ApplicationUser user,
            string permission,
            ApplicationDbContext context)
        {
            var roles = await userManager.GetRolesAsync(user);
            
            // Kiểm tra permissions của các roles
            var rolePermissions = await context.RolePermissions
                .Where(rp => roles.Contains(rp.RoleName))
                .Select(rp => rp.Permission)
                .Distinct()
                .ToListAsync();
            
            if (rolePermissions.Contains(permission))
                return true;
            
            return false;
        }
        
        /// <summary>
        /// Lấy danh sách permissions của user
        /// </summary>
        public static async Task<IEnumerable<string>> GetPermissionsAsync(
            this UserManager<ApplicationUser> userManager,
            ApplicationUser user,
            ApplicationDbContext context)
        {
            var roles = await userManager.GetRolesAsync(user);
            
            var permissions = await context.RolePermissions
                .Where(rp => roles.Contains(rp.RoleName))
                .Select(rp => rp.Permission)
                .Distinct()
                .ToListAsync();
            
            return permissions;
        }
        
        /// <summary>
        /// Kiểm tra nếu user có bất kỳ permission nào trong danh sách
        /// </summary>
        public static async Task<bool> HasAnyPermissionAsync(
            this UserManager<ApplicationUser> userManager,
            ApplicationUser user,
            IEnumerable<string> permissions,
            ApplicationDbContext context)
        {
            var roles = await userManager.GetRolesAsync(user);
            
            var rolePermissions = await context.RolePermissions
                .Where(rp => roles.Contains(rp.RoleName) && permissions.Contains(rp.Permission))
                .Select(rp => rp.Permission)
                .Distinct()
                .ToListAsync();
            
            return rolePermissions.Count > 0;
        }
        
        /// <summary>
        /// Kiểm tra nếu user có tất cả permissions trong danh sách
        /// </summary>
        public static async Task<bool> HasAllPermissionsAsync(
            this UserManager<ApplicationUser> userManager,
            ApplicationUser user,
            IEnumerable<string> permissions,
            ApplicationDbContext context)
        {
            var requiredPermissions = permissions.ToList();
            if (requiredPermissions.Count == 0)
                return true;
            
            var roles = await userManager.GetRolesAsync(user);
            
            var rolePermissions = await context.RolePermissions
                .Where(rp => roles.Contains(rp.RoleName))
                .Select(rp => rp.Permission)
                .Distinct()
                .ToListAsync();
            
            return requiredPermissions.All(p => rolePermissions.Contains(p));
        }
    }
}