using IPManagement.API.DTOs;
using IPManagement.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Threading;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            if (result == null)
                return Unauthorized(new { message = "Invalid email or password" });

            return Ok(result);
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult> Logout()
        {
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<ActionResult<UserDetailDto>> GetProfile()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var user = await _authService.GetCurrentUserAsync(userId);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _authService.ChangePasswordAsync(userId, request);
            if (!result)
                return BadRequest(new { message = "Failed to change password" });

            return Ok(new { message = "Password changed successfully" });
        }

        [HttpPost("admin/users/{userId}/reset-password")]
        [Authorize]
        public async Task<ActionResult> AdminResetPassword(Guid userId, [FromBody] AdminChangePasswordRequest request)
        {
            var result = await _authService.AdminChangePasswordAsync(userId, request);
            if (!result)
                return BadRequest(new { message = "Failed to reset password" });

            return Ok(new { message = "Password reset successfully" });
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
                return BadRequest(new { message = "Refresh token is required" });

            var result = await _authService.RefreshTokenAsync(request.RefreshToken);
            if (result == null)
                return Unauthorized(new { message = "Invalid refresh token" });

            return Ok(result);
        }
    }
}