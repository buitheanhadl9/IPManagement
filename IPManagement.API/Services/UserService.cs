using IPManagement.API.Data;
using IPManagement.API.DTOs;
using IPManagement.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using IPManagement.API.Hubs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public interface IUserService
    {
        Task<UserListResponse> GetUsersAsync(Guid userId, int pageNumber, int pageSize, long? unitId);
        Task<UserDetailDto?> GetUserByIdAsync(Guid userId, Guid targetUserId);
        Task<UserDetailDto> CreateUserAsync(Guid userId, UserCreateRequest request);
        Task<UserDetailDto?> UpdateUserAsync(Guid userId, Guid targetUserId, UserUpdateRequest request);
        Task<bool> DeleteUserAsync(Guid userId, Guid targetUserId);
    }

    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<UserService> _logger;

        public UserService(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IHubContext<NotificationHub> hubContext,
            ILogger<UserService> logger)
        {
            _context = context;
            _userManager = userManager;
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task<UserListResponse> GetUsersAsync(Guid userId, int pageNumber, int pageSize, long? unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return new UserListResponse { Items = Array.Empty<UserListDto>() };

            var isAdmin = await IsAdminAsync(user);
            var userRoles = await _userManager.GetRolesAsync(user);
            var isRegularUser = userRoles.Contains("User") && !isAdmin;
            
            var query = _context.Users
                .Include(u => u.UserUnitAssignments)
                    .ThenInclude(ua => ua.Unit)
                .AsQueryable();

            // Nếu là User (chỉ xem), xem được data của các unit được gán
            if (isRegularUser)
            {
                var userUnits = await _context.UserUnitAssignments
                    .Where(ua => ua.UserId == user.Id)
                    .Select(ua => ua.UnitId)
                    .ToListAsync();
                
                if (userUnits.Count == 0)
                {
                    return new UserListResponse { Items = Array.Empty<UserListDto>() };
                }
                
                // Chỉ xem được user trong cùng các unit được gán
                query = query.Where(u => _context.UserUnitAssignments
                    .Any(ua => ua.UserId == u.Id && userUnits.Contains(ua.UnitId)));
            }
            // Nếu không phải admin và không phải User (ví dụ UnitAdmin), chỉ xem được user cùng primary unit
            else if (!isAdmin)
            {
                var primaryAssignment = await _context.UserUnitAssignments
                    .FirstOrDefaultAsync(ua => ua.UserId == user.Id && ua.IsPrimary);
                if (primaryAssignment != null)
                {
                    query = query.Where(u => _context.UserUnitAssignments
                        .Any(ua => ua.UserId == u.Id && ua.UnitId == primaryAssignment.UnitId && ua.IsPrimary));
                }
                else
                {
                    return new UserListResponse { Items = Array.Empty<UserListDto>() };
                }
            }

            if (unitId.HasValue)
            {
                query = query.Where(u => _context.UserUnitAssignments
                    .Any(ua => ua.UserId == u.Id && ua.UnitId == unitId.Value));
            }

            var userEntities = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = new List<UserListDto>();
            foreach (var u in userEntities)
            {
                var roles = await _userManager.GetRolesAsync(u);
                var units = u.UserUnitAssignments
                    .Select(ua => new UserUnitDto
                    {
                        Id = ua.UnitId,
                        Name = ua.Unit.Name,
                        Role = ua.Role,
                        IsPrimary = ua.IsPrimary
                    })
                    .ToArray();
                
                items.Add(new UserListDto
                {
                    Id = Guid.Parse(u.Id),
                    Username = u.UserName!,
                    Email = u.Email!,
                    FullName = u.FullName,
                    UnitName = u.UserUnitAssignments
                        .Where(ua => ua.IsPrimary)
                        .Select(ua => ua.Unit.Name)
                        .FirstOrDefault(),
                    Units = units,
                    Roles = roles.ToArray(),
                    IsActive = u.IsActive,
                    LastLogin = u.LastLogin
                });
            }

            var totalCount = await query.CountAsync();

            return new UserListResponse
            {
                Items = items.ToArray(),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<UserDetailDto?> GetUserByIdAsync(Guid userId, Guid targetUserId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return null;

            if (!await IsAdminAsync(user))
            {
                var targetUser = await _context.Users.FindAsync(targetUserId.ToString());
                if (targetUser != null)
                {
                    // Kiểm tra xem có cùng unit assignment nào không
                    var userPrimaryUnit = await _context.UserUnitAssignments
                        .Where(ua => ua.UserId == user.Id && ua.IsPrimary)
                        .Select(ua => ua.UnitId)
                        .FirstOrDefaultAsync();
                    var targetPrimaryUnit = await _context.UserUnitAssignments
                        .Where(ua => ua.UserId == targetUser.Id && ua.IsPrimary)
                        .Select(ua => ua.UnitId)
                        .FirstOrDefaultAsync();
                    if (userPrimaryUnit != targetPrimaryUnit)
                        return null;
                }
            }

            var target = await _context.Users
                .Include(u => u.UserUnitAssignments)
                    .ThenInclude(ua => ua.Unit)
                .FirstOrDefaultAsync(u => u.Id == targetUserId.ToString());

            if (target == null)
                return null;

            var roles = await _userManager.GetRolesAsync(target);
            var unitAssignments = target.UserUnitAssignments
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
                Id = Guid.Parse(target.Id),
                Username = target.UserName!,
                Email = target.Email!,
                FullName = target.FullName,
                Phone = target.Phone,
                Units = unitAssignments,
                Roles = roles.ToArray(),
                IsActive = target.IsActive,
                CreatedAt = target.CreatedAt,
                UpdatedAt = target.UpdatedAt,
                LastLogin = target.LastLogin
            };
        }

        public async Task<UserDetailDto> CreateUserAsync(Guid userId, UserCreateRequest request)
        {
            var creator = await _context.Users.FindAsync(userId.ToString());
            if (creator == null)
                throw new UnauthorizedAccessException("User not found");

            if (!await IsAdminAsync(creator))
                throw new UnauthorizedAccessException("Only admins can create users");

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
                throw new InvalidOperationException("User with this email already exists");

            var user = new ApplicationUser
            {
                UserName = request.Username,
                Email = request.Email,
                FullName = request.FullName,
                Phone = request.Phone,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));

            if (request.Roles != null && request.Roles.Length > 0)
            {
                await _userManager.AddToRolesAsync(user, request.Roles);
            }

            // Tạo unit assignments
            if (request.UnitAssignments != null && request.UnitAssignments.Length > 0)
            {
                var assignedUnitIds = new List<long>();
                foreach (var assignment in request.UnitAssignments)
                {
                    _context.UserUnitAssignments.Add(new UserUnitAssignment
                    {
                        UserId = user.Id,
                        UnitId = assignment.UnitId,
                        Role = assignment.Role,
                        IsPrimary = assignment.IsPrimary
                    });
                    assignedUnitIds.Add(assignment.UnitId);
                }
                await _context.SaveChangesAsync();

                // Gửi notification đến user được gán
                await SendUnitAssignmentNotificationAsync(user.Id, assignedUnitIds, "Assigned");
            }

            // Load lại unit assignments
            await _context.Entry(user)
                .Collection(u => u.UserUnitAssignments)
                .Query()
                .Include(ua => ua.Unit)
                .LoadAsync();

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
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<UserDetailDto?> UpdateUserAsync(Guid userId, Guid targetUserId, UserUpdateRequest request)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return null;

            if (!await IsAdminAsync(user))
                throw new UnauthorizedAccessException("Only admins can update users");

            var target = await _context.Users
                .Include(u => u.UserUnitAssignments)
                .FirstOrDefaultAsync(u => u.Id == targetUserId.ToString());

            if (target == null)
                return null;

            target.Email = request.Email;
            target.FullName = request.FullName;
            target.Phone = request.Phone;
            target.IsActive = request.IsActive;
            target.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Cập nhật unit assignments
            if (request.UnitAssignments != null)
            {
                _logger.LogInformation($"[UPDATE_USER] User '{target.Id}' has {request.UnitAssignments.Length} unit assignments in request");

                // Lưu old unit ids trước khi xóa
                var oldUnitIds = target.UserUnitAssignments.Select(ua => ua.UnitId).ToList();
                var newUnitIds = request.UnitAssignments.Select(a => a.UnitId).ToList();

                _logger.LogInformation($"[UPDATE_USER] Old unit IDs: [{string.Join(", ", oldUnitIds)}]");
                _logger.LogInformation($"[UPDATE_USER] New unit IDs: [{string.Join(", ", newUnitIds)}]");

                // Xóa các assignments cũ
                _context.UserUnitAssignments.RemoveRange(target.UserUnitAssignments);

                // Thêm các assignments mới
                foreach (var assignment in request.UnitAssignments)
                {
                    _context.UserUnitAssignments.Add(new UserUnitAssignment
                    {
                        UserId = target.Id,
                        UnitId = assignment.UnitId,
                        Role = assignment.Role,
                        IsPrimary = assignment.IsPrimary
                    });
                }
                await _context.SaveChangesAsync();

                // Gửi notification đến user nếu có thay đổi
                bool hasUnitChange = oldUnitIds.Count != newUnitIds.Count || oldUnitIds.Any(u => !newUnitIds.Contains(u)) || newUnitIds.Any(u => !oldUnitIds.Contains(u));
                _logger.LogInformation($"[UPDATE_USER] Has unit change: {hasUnitChange}");

                if (hasUnitChange)
                {
                    await SendUnitAssignmentNotificationAsync(target.Id, newUnitIds, "Assigned");
                }
                else
                {
                    _logger.LogInformation($"[UPDATE_USER] No unit change detected, skipping notification");
                }
            }
            else
            {
                _logger.LogInformation($"[UPDATE_USER] request.UnitAssignments is null, skipping unit update");
            }

            // Cập nhật roles
            if (request.Roles != null)
            {
                await _userManager.RemoveFromRolesAsync(target, await _userManager.GetRolesAsync(target));
                await _userManager.AddToRolesAsync(target, request.Roles);
            }

            // Load lại dữ liệu
            await _context.Entry(target)
                .Collection(u => u.UserUnitAssignments)
                .Query()
                .Include(ua => ua.Unit)
                .LoadAsync();

            var roles = await _userManager.GetRolesAsync(target);
            var unitAssignments = target.UserUnitAssignments
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
                Id = Guid.Parse(target.Id),
                Username = target.UserName!,
                Email = target.Email!,
                FullName = target.FullName,
                Phone = target.Phone,
                Units = unitAssignments,
                Roles = roles.ToArray(),
                IsActive = target.IsActive,
                CreatedAt = target.CreatedAt,
                UpdatedAt = target.UpdatedAt,
                LastLogin = target.LastLogin
            };
        }

        public async Task<bool> DeleteUserAsync(Guid userId, Guid targetUserId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            if (!await IsAdminAsync(user))
                throw new UnauthorizedAccessException("Only admins can delete users");

            if (userId == targetUserId)
                throw new InvalidOperationException("Cannot delete yourself");

            var target = await _context.Users.FindAsync(targetUserId.ToString());
            if (target == null)
                return false;

            // Xóa các unit assignments trước
            var assignments = await _context.UserUnitAssignments
                .Where(ua => ua.UserId == target.Id)
                .ToListAsync();
            _context.UserUnitAssignments.RemoveRange(assignments);
            await _context.SaveChangesAsync();

            await _userManager.DeleteAsync(target);
            return true;
        }

        private async Task<bool> IsAdminAsync(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            return roles.Contains("Admin");
        }

        /// <summary>
        /// Gửi notification đến user khi được gán hoặc gỡ khỏi unit
        /// </summary>
        private async Task SendUnitAssignmentNotificationAsync(string userId, List<long> unitIds, string action)
        {
            try
            {
                _logger.LogInformation($"[NOTIFICATION] Preparing to send unit assignment notification - User ID: '{userId}', Action: {action}, Unit IDs: {string.Join(", ", unitIds)}");

                // Gửi notification đến user
                var notification = new UnitUpdateNotificationDto
                {
                    UnitId = unitIds.FirstOrDefault(),
                    UnitName = null,
                    Action = action == "Assigned" ? "Updated" : "Deleted",
                    UpdatedAt = DateTime.UtcNow,
                    UpdatedBy = null
                };

                // Gửi đến group của user (thay vì Clients.User)
                var targetUser = await _userManager.FindByIdAsync(userId);
                if (targetUser != null)
                {
                    var roles = await _userManager.GetRolesAsync(targetUser);
                    foreach (var role in roles)
                    {
                        await _hubContext.Clients.Group($"role:{role}")
                            .SendAsync("UnitUpdated", notification);
                    }
                }

                _logger.LogInformation($"[NOTIFICATION] Successfully sent unit assignment notification to user '{userId}' - Action: {action}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[NOTIFICATION] Failed to send unit assignment notification to user '{UserId}'", userId);
            }
        }
    }
}