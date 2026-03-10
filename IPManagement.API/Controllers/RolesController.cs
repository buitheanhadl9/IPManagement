using IPManagement.API.DTOs;
using IPManagement.API.Services;
using IPManagement.API.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using IPManagement.API.Data;
using IPManagement.API.Models;
using Microsoft.AspNetCore.Http;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;
        private readonly ApplicationDbContext _context;
        private readonly IPermissionNotificationService _permissionNotificationService;

        public RolesController(
            IRoleService roleService,
            ApplicationDbContext context,
            IPermissionNotificationService permissionNotificationService)
        {
            _roleService = roleService;
            _context = context;
            _permissionNotificationService = permissionNotificationService;
        }

        [HttpGet]
        [RequirePermission(FunctionCode.ROLE, CommandCode.VIEW)]
        public async Task<ActionResult<IEnumerable<RoleDto>>> GetAllRoles()
        {
            var roles = await _roleService.GetAllRolesAsync();
            return Ok(roles);
        }

        [HttpGet("{roleId}")]
        [RequirePermission(FunctionCode.ROLE, CommandCode.VIEW)]
        public async Task<ActionResult<RoleDto>> GetRoleById(string roleId)
        {
            var role = await _roleService.GetRoleByIdAsync(roleId);
            if (role == null)
                return NotFound();

            return Ok(role);
        }

        [HttpPost]
        [RequirePermission(FunctionCode.ROLE, CommandCode.CREATE)]
        public async Task<ActionResult<RoleDto>> CreateRole([FromBody] CreateRoleRequest request)
        {
            var role = await _roleService.CreateRoleAsync(request);
            if (role == null)
                return BadRequest(new { message = "Role already exists or failed to create" });

            return Ok(role);
        }

        [HttpPut("{roleId}")]
        [RequirePermission(FunctionCode.ROLE, CommandCode.UPDATE)]
        public async Task<ActionResult> UpdateRole(string roleId, [FromBody] UpdateRoleRequest request)
        {
            var result = await _roleService.UpdateRoleAsync(roleId, request);
            if (!result)
                return NotFound();

            return Ok(new { message = "Role updated successfully" });
        }

        [HttpDelete("{roleId}")]
        [RequirePermission(FunctionCode.ROLE, CommandCode.DELETE)]
        public async Task<ActionResult> DeleteRole(string roleId)
        {
            var result = await _roleService.DeleteRoleAsync(roleId);
            if (!result)
                return BadRequest(new { message = "Cannot delete built-in roles or role not found" });

            return Ok(new { message = "Role deleted successfully" });
        }

        [HttpGet("user/{userId}")]
        [RequirePermission(FunctionCode.ROLE, CommandCode.VIEW)]
        public async Task<ActionResult<IEnumerable<RoleDto>>> GetUserRoles(string userId)
        {
            var roles = await _roleService.GetUserRolesAsync(userId);
            return Ok(roles);
        }

        [HttpPost("user/{userId}/assign")]
        [RequirePermission(FunctionCode.ROLE, CommandCode.UPDATE)]
        public async Task<ActionResult> AssignRoleToUser(string userId, [FromBody] AssignRoleToUserRequest request)
        {
            var result = await _roleService.AssignRoleToUserAsync(userId, request.RoleName);
            if (!result)
                return BadRequest(new { message = "Failed to assign role" });

            return Ok(new { message = "Role assigned successfully" });
        }

        [HttpPost("user/{userId}/remove")]
        [RequirePermission(FunctionCode.ROLE, CommandCode.UPDATE)]
        public async Task<ActionResult> RemoveRoleFromUser(string userId, [FromBody] RemoveRoleFromUserRequest request)
        {
            var result = await _roleService.RemoveRoleFromUserAsync(userId, request.RoleName);
            if (!result)
                return BadRequest(new { message = "Failed to remove role" });

            return Ok(new { message = "Role removed successfully" });
        }

        /// <summary>
        /// Get permissions for a specific role
        /// </summary>
        [HttpGet("{roleId}/permissions")]
        [RequirePermission(FunctionCode.ROLE, CommandCode.VIEW)]
        public async Task<ActionResult<IEnumerable<string>>> GetRolePermissions(string roleId)
        {
            var role = await _context.Roles.FindAsync(roleId);
            if (role == null)
                return NotFound();

            var permissions = await _context.RolePermissions
                .Where(rp => rp.RoleName == role.Name)
                .Select(rp => rp.Permission)
                .ToListAsync();

            return Ok(permissions);
        }

        /// <summary>
        /// Update permissions for a specific role
        /// </summary>
        [HttpPut("{roleId}/permissions")]
        [RequirePermission(FunctionCode.ROLE, CommandCode.UPDATE)]
        public async Task<ActionResult> UpdateRolePermissions(string roleId, [FromBody] IEnumerable<string> permissions)
        {
            var role = await _context.Roles.FindAsync(roleId);
            if (role == null)
                return NotFound();

            // Remove existing permissions
            var existingPermissions = await _context.RolePermissions
                .Where(rp => rp.RoleName == role.Name)
                .ToListAsync();
            _context.RolePermissions.RemoveRange(existingPermissions);

            // Add new permissions
            var newPermissions = permissions.ToList();
            foreach (var permission in newPermissions)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleName = role.Name,
                    Permission = permission
                });
            }

            await _context.SaveChangesAsync();

            // Get current user name for notification
            var currentUser = User.Identity?.Name ?? "Unknown";

            // Send real-time notification to all users in this role
            await _permissionNotificationService.NotifyPermissionsUpdatedAsync(
                role.Name,
                newPermissions.ToArray(),
                currentUser);

            return Ok(new { message = "Permissions updated successfully" });
        }

        /// <summary>
        /// Get all available permissions
        /// </summary>
        [HttpGet("permissions/all")]
        [Authorize(Policy = Permissions.RoleRead)]
        public ActionResult<IEnumerable<string>> GetAllAvailablePermissions()
        {
            var allPermissions = new[]
            {
                Permissions.IpCreate, Permissions.IpRead, Permissions.IpUpdate, Permissions.IpDelete,
                Permissions.UnitCreate, Permissions.UnitRead, Permissions.UnitUpdate, Permissions.UnitDelete,
                Permissions.UserCreate, Permissions.UserRead, Permissions.UserUpdate, Permissions.UserDelete,
                Permissions.RoleCreate, Permissions.RoleRead, Permissions.RoleUpdate, Permissions.RoleDelete
            };
            return Ok(allPermissions);
        }
    }
}