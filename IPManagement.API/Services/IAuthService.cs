using IPManagement.API.DTOs;
using System;
using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public interface IAuthService
    {
        Task<LoginResponse?> LoginAsync(LoginRequest request);
        Task<LoginResponse?> RefreshTokenAsync(string refreshToken);
        Task<UserDetailDto?> GetUserByIdAsync(Guid userId);
        Task<UserDetailDto?> GetCurrentUserAsync(Guid userId);
        Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
        Task<bool> AdminChangePasswordAsync(Guid userId, AdminChangePasswordRequest request);
    }
}