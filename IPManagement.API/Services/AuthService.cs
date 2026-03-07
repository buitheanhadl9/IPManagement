using IPManagement.API.Data;
using IPManagement.API.DTOs;
using IPManagement.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly JwtSettings _jwtSettings;

        public AuthService(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IConfiguration configuration)
        {
            _context = context;
            _userManager = userManager;
            _jwtSettings = new JwtSettings
            {
                SecretKey = configuration["JwtSettings:SecretKey"] ?? "your-256-bit-secret-key-must-be-long-enough",
                Issuer = configuration["JwtSettings:Issuer"] ?? "IPManagementAPI",
                Audience = configuration["JwtSettings:Audience"] ?? "IPManagementClient",
                AccessTokenExpirationMinutes = int.Parse(configuration["JwtSettings:AccessTokenExpirationMinutes"] ?? "30"),
                RefreshTokenExpirationDays = int.Parse(configuration["JwtSettings:RefreshTokenExpirationDays"] ?? "7")
            };
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            // Kiểm tra xem input có phải là email không
            var isEmail = request.UsernameOrEmail.Contains("@");
            ApplicationUser? user = null;

            if (isEmail)
            {
                // Tìm theo email
                user = await _userManager.FindByEmailAsync(request.UsernameOrEmail);
            }
            else
            {
                // Tìm theo username
                user = await _userManager.FindByNameAsync(request.UsernameOrEmail);
            }

            if (user == null || !user.IsActive)
                return null;

            var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!passwordValid)
                return null;

            var token = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();

            // Save refresh token (you might want to store this in a database)
            user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(5); // Example: store token expiry

            var roles = await _userManager.GetRolesAsync(user);
            
            // Load unit assignments
            await _context.Entry(user)
                .Collection(u => u.UserUnitAssignments)
                .Query()
                .Include(ua => ua.Unit)
                .LoadAsync();
            
            var unitAssignments = user.UserUnitAssignments
                .Select(ua => new UserUnitDto
                {
                    Id = ua.UnitId,
                    Name = ua.Unit.Name,
                    Role = ua.Role,
                    IsPrimary = ua.IsPrimary
                })
                .ToArray();

            // Get primary unit name
            var primaryUnitName = user.UserUnitAssignments
                .Where(ua => ua.IsPrimary)
                .Select(ua => ua.Unit.Name)
                .FirstOrDefault();

            return new LoginResponse
            {
                Token = token,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes),
                User = new UserDto
                {
                    Id = Guid.Parse(user.Id),
                    Username = user.UserName!,
                    Email = user.Email!,
                    FullName = user.FullName,
                    Phone = user.Phone,
                    Units = unitAssignments,
                    UnitName = primaryUnitName,
                    Roles = roles.ToArray()
                }
            };
        }

        public async Task<LoginResponse?> RefreshTokenAsync(string refreshToken)
        {
            // Implement refresh token logic
            return null;
        }

        public async Task<UserDetailDto?> GetUserByIdAsync(Guid userId)
        {
            var user = await _context.Users
                .Include(u => u.UserUnitAssignments)
                    .ThenInclude(ua => ua.Unit)
                .Where(u => u.Id == userId.ToString())
                .FirstOrDefaultAsync();

            if (user == null)
                return null;

            var roles = await _userManager.GetRolesAsync(user);
            var unitAssignments = user.UserUnitAssignments
                .Select(ua => new UserUnitDto
                {
                    Id = ua.UnitId,
                    Name = ua.Unit.Name,
                    Role = ua.Role,
                    IsPrimary = ua.IsPrimary
                })
                .ToArray();

            return new UserDetailDto
            {
                Id = Guid.Parse(user.Id),
                Username = user.UserName!,
                Email = user.Email!,
                FullName = user.FullName,
                Phone = user.Phone,
                Units = unitAssignments,
                Roles = roles.ToArray(),
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                LastLogin = user.LastLogin
            };
        }

        public async Task<UserDetailDto?> GetCurrentUserAsync(Guid userId)
        {
            return await GetUserByIdAsync(userId);
        }

        public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                return false;

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            return result.Succeeded;
        }

        private string GenerateJwtToken(ApplicationUser user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var roles = _userManager.GetRolesAsync(user).Result;
            var roleClaims = roles.Select(role => new Claim(ClaimTypes.Role, role)).ToArray();

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.UserName!),
                new Claim(ClaimTypes.Email, user.Email!),
                new Claim("FullName", user.FullName ?? string.Empty),
                new Claim("UnitId", user.UnitId?.ToString() ?? string.Empty)
            }.Concat(roleClaims);

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<bool> AdminChangePasswordAsync(Guid userId, AdminChangePasswordRequest request)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                return false;

            // Tạo password validator để đảm bảo mật khẩu mạnh
            var passwordValidator = new PasswordValidator<ApplicationUser>();
            var validationResult = await passwordValidator.ValidateAsync(_userManager, user, request.NewPassword);
            
            if (!validationResult.Succeeded)
            {
                // Nếu validation fail, vẫn cho phép đổi mật khẩu (admin có quyền đặc biệt)
                // Nhưng nên có mật khẩu đủ mạnh
            }

            // Sử dụng ResetPasswordAsync với token rỗng hoặc tạo token mới
            // Cách đơn giản nhất là dùng ChangePasswordAsync với null current password
            // nhưng điều này không được hỗ trợ bởi default Identity
            
            // Giải pháp: Tạo password hash mới và set trực tiếp
            // Đây là cách admin reset password mà không cần biết mật khẩu cũ
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);
            return resetResult.Succeeded;
        }

        private string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }
    }

    public class JwtSettings
    {
        public string SecretKey { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
        public int AccessTokenExpirationMinutes { get; set; } = 30;
        public int RefreshTokenExpirationDays { get; set; } = 7;
    }
}