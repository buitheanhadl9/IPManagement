using System.Security.Claims;
using IPManagement.API.Data;
using IPManagement.API.Extensions;
using IPManagement.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PermissionsController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;

        public PermissionsController(
            UserManager<ApplicationUser> userManager,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        /// <summary>
        /// Get current user's permissions
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMyPermissions()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound("User not found");

            var permissions = await _userManager.GetPermissionsAsync(user, _context);

            return Ok(new { permissions = permissions.ToArray() });
        }

        /// <summary>
        /// Get permissions for a specific role
        /// </summary>
        [HttpGet("role/{roleName}")]
        [Authorize(Policy = Permissions.RoleRead)]
        public async Task<IActionResult> GetRolePermissions(string roleName)
        {
            var permissions = await _context.RolePermissions
                .Where(rp => rp.RoleName == roleName)
                .Select(rp => rp.Permission)
                .ToListAsync();

            return Ok(new { roleName, permissions });
        }

        /// <summary>
        /// Get all roles and their permissions
        /// </summary>
        [HttpGet("roles")]
        [Authorize(Policy = Permissions.RoleRead)]
        public async Task<IActionResult> GetAllRolePermissions()
        {
            var rolePermissions = await _context.RolePermissions
                .GroupBy(rp => rp.RoleName)
                .Select(g => new
                {
                    roleName = g.Key,
                    permissions = g.Select(rp => rp.Permission).ToArray()
                })
                .ToListAsync();

            return Ok(rolePermissions);
        }

        /// <summary>
        /// Check if current user has a specific permission
        /// </summary>
        [HttpGet("check/{permission}")]
        [Authorize]
        public async Task<IActionResult> CheckPermission(string permission)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound("User not found");

            var hasPermission = await _userManager.HasPermissionAsync(user, permission, _context);

            return Ok(new { permission, hasPermission });
        }
    }
}