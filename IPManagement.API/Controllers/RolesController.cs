using IPManagement.API.DTOs;
using IPManagement.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;

        public RolesController(IRoleService roleService)
        {
            _roleService = roleService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RoleDto>>> GetAllRoles()
        {
            var roles = await _roleService.GetAllRolesAsync();
            return Ok(roles);
        }

        [HttpGet("{roleId}")]
        public async Task<ActionResult<RoleDto>> GetRoleById(string roleId)
        {
            var role = await _roleService.GetRoleByIdAsync(roleId);
            if (role == null)
                return NotFound();

            return Ok(role);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<RoleDto>> CreateRole([FromBody] CreateRoleRequest request)
        {
            var role = await _roleService.CreateRoleAsync(request);
            if (role == null)
                return BadRequest(new { message = "Role already exists or failed to create" });

            return Ok(role);
        }

        [HttpPut("{roleId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> UpdateRole(string roleId, [FromBody] UpdateRoleRequest request)
        {
            var result = await _roleService.UpdateRoleAsync(roleId, request);
            if (!result)
                return NotFound();

            return Ok(new { message = "Role updated successfully" });
        }

        [HttpDelete("{roleId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteRole(string roleId)
        {
            var result = await _roleService.DeleteRoleAsync(roleId);
            if (!result)
                return BadRequest(new { message = "Cannot delete built-in roles or role not found" });

            return Ok(new { message = "Role deleted successfully" });
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<RoleDto>>> GetUserRoles(string userId)
        {
            var roles = await _roleService.GetUserRolesAsync(userId);
            return Ok(roles);
        }

        [HttpPost("user/{userId}/assign")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> AssignRoleToUser(string userId, [FromBody] AssignRoleToUserRequest request)
        {
            var result = await _roleService.AssignRoleToUserAsync(userId, request.RoleName);
            if (!result)
                return BadRequest(new { message = "Failed to assign role" });

            return Ok(new { message = "Role assigned successfully" });
        }

        [HttpPost("user/{userId}/remove")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> RemoveRoleFromUser(string userId, [FromBody] RemoveRoleFromUserRequest request)
        {
            var result = await _roleService.RemoveRoleFromUserAsync(userId, request.RoleName);
            if (!result)
                return BadRequest(new { message = "Failed to remove role" });

            return Ok(new { message = "Role removed successfully" });
        }
    }
}