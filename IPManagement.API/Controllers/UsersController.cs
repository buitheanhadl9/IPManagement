using IPManagement.API.DTOs;
using IPManagement.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<ActionResult<UserListResponse>> GetUsers(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] long? unitId = null)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _userService.GetUsersAsync(userId, pageNumber, pageSize, unitId);
            return Ok(result);
        }

        [HttpGet("{userId}")]
        public async Task<ActionResult<UserDetailDto>> GetUser(Guid userId)
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _userService.GetUserByIdAsync(currentUserId, userId);
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<UserDetailDto>> CreateUser([FromBody] UserCreateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _userService.CreateUserAsync(userId, request);
                return CreatedAtAction(nameof(GetUser), new { userId = result.Id }, result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to create users" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{userId}")]
        public async Task<ActionResult<UserDetailDto>> UpdateUser(Guid userId, [FromBody] UserUpdateRequest request)
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _userService.UpdateUserAsync(currentUserId, userId, request);
                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to update users" });
            }
        }

        [HttpDelete("{userId}")]
        public async Task<ActionResult> DeleteUser(Guid userId)
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _userService.DeleteUserAsync(currentUserId, userId);
                if (!result)
                    return NotFound();

                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to delete users" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("unit/{unitId}")]
        public async Task<ActionResult<UserListResponse>> GetUsersByUnit(long unitId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _userService.GetUsersAsync(userId, pageNumber, pageSize, unitId);
            return Ok(result);
        }
    }
}