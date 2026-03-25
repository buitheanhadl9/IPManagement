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
    public interface IUnitService
    {
        Task<UnitDto[]> GetAllUnitsAsync(Guid userId);
        Task<UnitTreeDto[]> GetUnitTreeAsync(Guid userId);
        Task<UnitDto?> GetUnitByIdAsync(Guid userId, long unitId);
        Task<UnitDto> CreateUnitAsync(Guid userId, UnitCreateRequest request);
        Task<UnitDto?> UpdateUnitAsync(Guid userId, long unitId, UnitUpdateRequest request);
        Task<bool> DeleteUnitAsync(Guid userId, long unitId);
        Task<UnitDto> GetMyUnitAsync(Guid userId);
        Task<UnitSelectionDto[]> GetAllUnitsForSelectionAsync();
        Task NotifyUnitChangeAsync(long unitId, string action, string? updatedBy);
        Task UpdateUnitDisplayOrderAsync(Guid userId, Dictionary<long, int> unitOrderMap);
    }

    public class UnitService : IUnitService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<UnitService> _logger;
        private readonly IGeocodingService? _geocodingService;

        public UnitService(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IHubContext<NotificationHub> hubContext,
            ILogger<UnitService> logger,
            IGeocodingService? geocodingService = null)
        {
            _context = context;
            _userManager = userManager;
            _hubContext = hubContext;
            _logger = logger;
            _geocodingService = geocodingService;
        }

        public async Task<UnitDto[]> GetAllUnitsAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return Array.Empty<UnitDto>();

            // Check if user has UNIT_READ permission from database
            var hasUnitReadPermission = await HasPermissionAsync(user, Permissions.UnitRead);

            if (!hasUnitReadPermission)
            {
                return Array.Empty<UnitDto>();
            }

            // Check if user is Admin - Admin can see all units
            var isAdmin = await IsAdminAsync(user);
            if (isAdmin)
            {
                var allUnitsQuery = _context.Units
                    .Include(u => u.ParentUnit)
                    .Include(u => u.TransmissionChannels)
                    .AsQueryable();

                var allUnits = await allUnitsQuery.OrderBy(u => u.Name).ToListAsync();
                
            return allUnits.Select(u => new UnitDto
            {
                Id = u.Id,
                ExternalId = u.ExternalId,
                Name = u.Name,
                Code = u.Code,
                Address = u.Address,
                ParentUnitId = u.ParentUnitId,
                ParentUnitName = u.ParentUnit == null ? null : u.ParentUnit.Name,
                Description = u.Description,
                Note = u.Note,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                IsActive = u.IsActive,
                DisplayOrder = u.DisplayOrder,
                IPAddressCount = CountIPsForUnit(u.Id),
                TransmissionChannelIds = u.TransmissionChannels?.Select(tc => tc.ChannelId).ToArray() ?? Array.Empty<long>()
            }).ToArray();
            }

            // Get assigned unit IDs for the user
            var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
            
            // If user has no assigned units, return empty array
            if (assignedUnitIds.Length == 0)
            {
                return Array.Empty<UnitDto>();
            }

            // Include child units of assigned units
            var unitIdsWithChildren = await GetUnitIdsWithChildrenAsync(assignedUnitIds);

            // Return only assigned units and their children
            var filteredUnitsQuery = _context.Units
                .Include(u => u.ParentUnit)
                .Include(u => u.TransmissionChannels)
                .Where(u => unitIdsWithChildren.Contains(u.Id))
                .AsQueryable();

            var units = await filteredUnitsQuery.OrderBy(u => u.Name).ToListAsync();
            
            return units.Select(u => new UnitDto
            {
                Id = u.Id,
                ExternalId = u.ExternalId,
                Name = u.Name,
                Code = u.Code,
                Address = u.Address,
                ParentUnitId = u.ParentUnitId,
                ParentUnitName = u.ParentUnit == null ? null : u.ParentUnit.Name,
                Description = u.Description,
                Note = u.Note,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                IsActive = u.IsActive,
                DisplayOrder = u.DisplayOrder,
                IPAddressCount = CountIPsForUnit(u.Id),
                TransmissionChannelIds = u.TransmissionChannels?.Select(tc => tc.ChannelId).ToArray() ?? Array.Empty<long>()
            }).ToArray();
        }

        public async Task<UnitTreeDto[]> GetUnitTreeAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return Array.Empty<UnitTreeDto>();

            // Check if user has UNIT_READ permission from database
            var hasUnitReadPermission = await HasPermissionAsync(user, Permissions.UnitRead);

            if (!hasUnitReadPermission)
            {
                return Array.Empty<UnitTreeDto>();
            }

            // Check if user is Admin - Admin can see all units
            var isAdmin = await IsAdminAsync(user);
            if (isAdmin)
            {
                // Get all root units
                var adminRootUnitsQuery = _context.Units
                    .Where(u => u.ParentUnitId == null)
                    .Include(u => u.ChildUnits)
                    .AsQueryable();

                var adminRootUnits = await adminRootUnitsQuery.ToListAsync();

                return adminRootUnits.Select(u => BuildUnitTree(u)).ToArray();
            }

            // Get assigned unit IDs for the user
            var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
            
            // If user has no assigned units, return empty array
            if (assignedUnitIds.Length == 0)
            {
                return Array.Empty<UnitTreeDto>();
            }

            // Get root units that are assigned to the user
            var rootUnitsQuery = _context.Units
                .Where(u => u.ParentUnitId == null && assignedUnitIds.Contains(u.Id))
                .Include(u => u.ChildUnits)
                .AsQueryable();

            var rootUnits = await rootUnitsQuery.ToListAsync();

            return rootUnits.Select(u => BuildUnitTreeFiltered(u, assignedUnitIds)).ToArray();
        }

        public async Task<UnitDto?> GetUnitByIdAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return null;

            // Check if user has UNIT_READ permission
            if (!await HasPermissionAsync(user, Permissions.UnitRead))
                return null;

            // Check if user is Admin - Admin can see all units
            var isAdmin = await IsAdminAsync(user);
            
            // For non-admin users, check if they have access to the requested unit
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                
                // If user has no assigned units or the requested unit is not assigned, return null
                if (assignedUnitIds.Length == 0 || !assignedUnitIds.Contains(unitId))
                    return null;
            }

            var unit = await _context.Units
                .Include(u => u.ParentUnit)
                .Include(u => u.ChildUnits)
                .Include(u => u.TransmissionChannels)
                .FirstOrDefaultAsync(u => u.Id == unitId);

            if (unit == null)
                return null;

            // For non-admin users, filter child units to only include assigned units
            UnitDto result;
            if (isAdmin)
            {
                result = new UnitDto
                {
                    Id = unit.Id,
                    ExternalId = unit.ExternalId,
                    Name = unit.Name,
                    Code = unit.Code,
                    ParentUnitId = unit.ParentUnitId,
                    ParentUnitName = unit.ParentUnit == null ? null : unit.ParentUnit.Name,
                    Description = unit.Description,
                    CreatedAt = unit.CreatedAt,
                    UpdatedAt = unit.UpdatedAt,
                    IsActive = unit.IsActive,
                    DisplayOrder = unit.DisplayOrder,
                    ChildUnits = unit.ChildUnits?.Select(c => new UnitDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Code = c.Code
                    }).ToArray() ?? Array.Empty<UnitDto>(),
                    IPAddressCount = unit.IPAddresses.Count,
                    TransmissionChannelIds = unit.TransmissionChannels?.Select(tc => tc.ChannelId).ToArray() ?? Array.Empty<long>()
                };
            }
            else
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                result = new UnitDto
                {
                    Id = unit.Id,
                    ExternalId = unit.ExternalId,
                    Name = unit.Name,
                    Code = unit.Code,
                    ParentUnitId = unit.ParentUnitId,
                    ParentUnitName = unit.ParentUnit == null ? null : unit.ParentUnit.Name,
                    Description = unit.Description,
                    CreatedAt = unit.CreatedAt,
                    UpdatedAt = unit.UpdatedAt,
                    IsActive = unit.IsActive,
                    DisplayOrder = unit.DisplayOrder,
                    ChildUnits = unit.ChildUnits
                        .Where(c => assignedUnitIds.Contains(c.Id))
                        .Select(c => new UnitDto
                        {
                            Id = c.Id,
                            Name = c.Name,
                            Code = c.Code
                        }).ToArray(),
                    IPAddressCount = unit.IPAddresses.Count,
                    TransmissionChannelIds = unit.TransmissionChannels?.Select(tc => tc.ChannelId).ToArray() ?? Array.Empty<long>()
                };
            }

            return result;
        }

        public async Task<UnitDto> CreateUnitAsync(Guid userId, UnitCreateRequest request)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            if (!await HasPermissionAsync(user, Permissions.UnitCreate))
                throw new UnauthorizedAccessException("You do not have permission to create units");

            Unit? parentUnit = null;
            if (request.ParentUnitId.HasValue)
            {
                parentUnit = await _context.Units.FindAsync(request.ParentUnitId.Value);
                if (parentUnit == null)
                    throw new InvalidOperationException("Parent unit not found");
            }

            var unit = new Unit
            {
                Name = request.Name,
                Code = request.Code,
                Address = request.Address,
                ParentUnitId = request.ParentUnitId,
                Description = request.Description,
                Note = request.Note,
                IsActive = true,
                Latitude = request.Latitude,
                Longitude = request.Longitude
            };

            // Nếu có tọa độ GPS và chưa có địa chỉ, gọi reverse geocoding
            if (request.Latitude.HasValue && request.Longitude.HasValue)
            {
                if (string.IsNullOrWhiteSpace(request.Address) && _geocodingService != null)
                {
                    try
                    {
                        var address = await _geocodingService.ReverseGeocodeAsync(request.Latitude.Value, request.Longitude.Value);
                        if (!string.IsNullOrWhiteSpace(address))
                        {
                            unit.Address = address;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Reverse geocoding failed for coordinates {Lat}, {Lon}", request.Latitude, request.Longitude);
                    }
                }
            }

            _context.Units.Add(unit);
            await _context.SaveChangesAsync();

            // Xử lý liên kết kênh truyền
            if (request.TransmissionChannelIds != null && request.TransmissionChannelIds.Length > 0)
            {
                foreach (var channelId in request.TransmissionChannelIds)
                {
                    var channelExists = await _context.TransmissionChannels.AnyAsync(c => c.Id == channelId);
                    if (channelExists)
                    {
                        // Kiểm tra xem liên kết đã tồn tại chưa
                        var existingAssignment = await _context.UnitTransmissionChannels
                            .FirstOrDefaultAsync(utc => utc.UnitId == unit.Id && utc.ChannelId == channelId);
                        
                        if (existingAssignment == null)
                        {
                            _context.UnitTransmissionChannels.Add(new UnitTransmissionChannel
                            {
                                UnitId = unit.Id,
                                ChannelId = channelId,
                                AssignedAt = DateTime.UtcNow,
                                AssignedBy = userId.ToString()
                            });
                        }
                    }
                }
                await _context.SaveChangesAsync();
            }

            // Tự động thêm user vào UserUnitAssignments với vai trò Admin của unit này
            var assignment = new UserUnitAssignment
            {
                UserId = userId.ToString(),
                UnitId = unit.Id,
                Role = "Admin",
                IsPrimary = true
            };
            _context.UserUnitAssignments.Add(assignment);
            await _context.SaveChangesAsync();

            // Gửi notification đến các user liên quan
            var currentUser = await _userManager.FindByIdAsync(userId.ToString());
            var createdBy = currentUser?.UserName ?? "Unknown";
            await NotifyUnitChangeAsync(unit.Id, "Created", createdBy);

            return new UnitDto
            {
                Id = unit.Id,
                ExternalId = unit.ExternalId,
                Name = unit.Name,
                Code = unit.Code,
                Address = unit.Address,
                ParentUnitId = unit.ParentUnitId,
                ParentUnitName = parentUnit == null ? null : parentUnit.Name,
                Description = unit.Description,
                Note = unit.Note,
                CreatedAt = unit.CreatedAt,
                IsActive = unit.IsActive,
                DisplayOrder = unit.DisplayOrder,
                TransmissionChannelIds = unit.TransmissionChannels?.Select(tc => tc.ChannelId).ToArray() ?? Array.Empty<long>(),
                Latitude = unit.Latitude,
                Longitude = unit.Longitude
            };
        }

        public async Task<UnitDto?> UpdateUnitAsync(Guid userId, long unitId, UnitUpdateRequest request)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return null;

            if (!await HasPermissionAsync(user, Permissions.UnitUpdate))
                throw new UnauthorizedAccessException("You do not have permission to update units");

            // Check if user is Admin - Admin can update all units
            var isAdmin = await IsAdminAsync(user);
            
            // For non-admin users, check if they have access to the requested unit via Unit Assignments
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                var unitIdsWithChildren = await GetUnitIdsWithChildrenAsync(assignedUnitIds);
                
                if (assignedUnitIds.Length == 0 || !unitIdsWithChildren.Contains(unitId))
                    throw new UnauthorizedAccessException("You do not have access to update this unit");
            }

            var unit = await _context.Units.FindAsync(unitId);
            if (unit == null)
                return null;

            Unit? parentUnit = null;
            if (request.ParentUnitId.HasValue && request.ParentUnitId.Value != unit.ParentUnitId)
            {
                parentUnit = await _context.Units.FindAsync(request.ParentUnitId.Value);
                if (parentUnit == null)
                    throw new InvalidOperationException("Parent unit not found");
            }

            unit.Name = request.Name;
            unit.Code = request.Code;
            unit.ParentUnitId = request.ParentUnitId;
            unit.Description = request.Description;
            unit.Note = request.Note;
            unit.IsActive = request.IsActive;
            unit.DisplayOrder = request.DisplayOrder;
            unit.UpdatedAt = DateTime.UtcNow;

            // Xử lý GPS coordinates
            if (request.Latitude.HasValue && request.Longitude.HasValue)
            {
                unit.Latitude = request.Latitude;
                unit.Longitude = request.Longitude;

                // Nếu có tọa độ GPS và chưa có địa chỉ, gọi reverse geocoding
                if (string.IsNullOrWhiteSpace(request.Address) && _geocodingService != null)
                {
                    try
                    {
                        var address = await _geocodingService.ReverseGeocodeAsync(request.Latitude.Value, request.Longitude.Value);
                        if (!string.IsNullOrWhiteSpace(address))
                        {
                            unit.Address = address;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Reverse geocoding failed for coordinates {Lat}, {Lon}", request.Latitude, request.Longitude);
                    }
                }
                else
                {
                    // Sử dụng address từ request
                    unit.Address = request.Address;
                }
            }
            else
            {
                // Không có GPS, sử dụng address từ request
                unit.Address = request.Address;
            }

            // Xử lý liên kết kênh truyền
            if (request.TransmissionChannelIds != null)
            {
                // Xóa các liên kết cũ
                var existingAssignments = await _context.UnitTransmissionChannels
                    .Where(utc => utc.UnitId == unitId)
                    .ToListAsync();
                _context.UnitTransmissionChannels.RemoveRange(existingAssignments);

                // Thêm các liên kết mới
                foreach (var channelId in request.TransmissionChannelIds)
                {
                    var channelExists = await _context.TransmissionChannels.AnyAsync(c => c.Id == channelId);
                    if (channelExists)
                    {
                        _context.UnitTransmissionChannels.Add(new UnitTransmissionChannel
                        {
                            UnitId = unitId,
                            ChannelId = channelId,
                            AssignedAt = DateTime.UtcNow,
                            AssignedBy = userId.ToString()
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();

            // Gửi notification đến các user liên quan
            var currentUser = await _userManager.FindByIdAsync(userId.ToString());
            var updatedBy = currentUser?.UserName ?? "Unknown";
            await NotifyUnitChangeAsync(unit.Id, "Updated", updatedBy);

            return new UnitDto
            {
                Id = unit.Id,
                ExternalId = unit.ExternalId,
                Name = unit.Name,
                Code = unit.Code,
                Address = unit.Address,
                ParentUnitId = unit.ParentUnitId,
                ParentUnitName = parentUnit == null ? (unit.ParentUnit == null ? null : unit.ParentUnit.Name) : parentUnit.Name,
                Description = unit.Description,
                Note = unit.Note,
                CreatedAt = unit.CreatedAt,
                UpdatedAt = unit.UpdatedAt,
                IsActive = unit.IsActive,
                DisplayOrder = unit.DisplayOrder,
                TransmissionChannelIds = unit.TransmissionChannels?.Select(tc => tc.ChannelId).ToArray() ?? Array.Empty<long>(),
                Latitude = unit.Latitude,
                Longitude = unit.Longitude
            };
        }

        public async Task<bool> DeleteUnitAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            if (!await HasPermissionAsync(user, Permissions.UnitDelete))
                throw new UnauthorizedAccessException("You do not have permission to delete units");

            // Check if user is Admin - Admin can delete all units
            var isAdmin = await IsAdminAsync(user);
            
            // For non-admin users, check if they have access to the requested unit via Unit Assignments
            if (!isAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                var unitIdsWithChildren = await GetUnitIdsWithChildrenAsync(assignedUnitIds);
                
                if (assignedUnitIds.Length == 0 || !unitIdsWithChildren.Contains(unitId))
                    throw new UnauthorizedAccessException("You do not have access to delete this unit");
            }

            var unit = await _context.Units
                .Include(u => u.ChildUnits)
                .Include(u => u.IPAddresses)
                .Include(u => u.UserUnitAssignments)
                .FirstOrDefaultAsync(u => u.Id == unitId);

            if (unit == null)
                return false;

            if (unit.ChildUnits.Any())
                throw new InvalidOperationException("Cannot delete unit with child units. Please delete or reassign child units first.");

            if (unit.IPAddresses.Any())
                throw new InvalidOperationException("Cannot delete unit with IP addresses. Please delete or reassign IP addresses first.");

            // Lưu danh sách user assignments trước khi xóa để gửi notification
            var userAssignments = unit.UserUnitAssignments.ToList();
            var unitName = unit.Name;

            // Xóa các bản ghi UserUnitAssignment trước khi xóa unit
            if (userAssignments.Any())
            {
                _context.UserUnitAssignments.RemoveRange(userAssignments);
            }

            _context.Units.Remove(unit);
            await _context.SaveChangesAsync();

            // Gửi notification đến các user liên quan sau khi xóa
            var currentUser = await _userManager.FindByIdAsync(userId.ToString());
            var updatedBy = currentUser?.UserName ?? "Unknown";
            
            // Gửi notification trực tiếp với danh sách user đã lưu
            if (userAssignments.Any())
            {
                var notification = new UnitUpdateNotificationDto
                {
                    UnitId = unit.Id,
                    UnitName = unitName,
                    Action = "Deleted",
                    UpdatedAt = DateTime.UtcNow,
                    UpdatedBy = updatedBy
                };

                // Gửi đến group của mỗi user (thay vì Clients.User)
                foreach (var assignment in userAssignments)
                {
                    var targetUser = await _userManager.FindByIdAsync(assignment.UserId);
                    if (targetUser != null)
                    {
                        var roles = await _userManager.GetRolesAsync(targetUser);
                        foreach (var role in roles)
                        {
                            await _hubContext.Clients.Group($"role:{role}")
                                .SendAsync("UnitUpdated", notification);
                        }
                    }
                }

                _logger.LogInformation($"Sent unit deleted notification for unit '{unitName}' (ID: {unitId}) to {userAssignments.Count} users");
            }

            return true;
        }

        public async Task<UnitDto> GetMyUnitAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            // Get the primary unit assignment
            var assignment = await _context.UserUnitAssignments
                .Where(a => a.UserId == userId.ToString())
                .OrderByDescending(a => a.IsPrimary)
                .FirstOrDefaultAsync();
            
            if (assignment == null)
                throw new UnauthorizedAccessException("User does not belong to any unit");

            var unit = await _context.Units.FindAsync(assignment.UnitId);
            if (unit == null)
                throw new InvalidOperationException("Unit not found");

            return new UnitDto
            {
                Id = unit.Id,
                ExternalId = unit.ExternalId,
                Name = unit.Name,
                Code = unit.Code,
                ParentUnitId = unit.ParentUnitId,
                ParentUnitName = unit.ParentUnit == null ? null : unit.ParentUnit.Name,
                Description = unit.Description,
                CreatedAt = unit.CreatedAt,
                UpdatedAt = unit.UpdatedAt,
                IsActive = unit.IsActive,
                DisplayOrder = unit.DisplayOrder,
                IPAddressCount = unit.IPAddresses.Count,
                TransmissionChannelIds = unit.TransmissionChannels?.Select(tc => tc.ChannelId).ToArray() ?? Array.Empty<long>()
            };
        }

        private async Task<bool> IsAdminAsync(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            return roles.Contains("Admin");
        }

        private async Task<bool> IsUnitAdminAsync(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            return roles.Contains("UnitAdmin");
        }

        private async Task<bool> CanAccessUnitAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            if (await IsAdminAsync(user))
                return true;

            // Check if user is UnitAdmin - check their assigned units via UserUnitAssignments
            if (await IsUnitAdminAsync(user))
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                var unitIdsWithChildren = await GetUnitIdsWithChildrenAsync(assignedUnitIds);
                return unitIdsWithChildren.Contains(unitId);
            }

            // Check if user has access to this unit via UserUnitAssignments
            return await _context.UserUnitAssignments
                .AnyAsync(a => a.UserId == userId.ToString() && a.UnitId == unitId);
        }

        /// <summary>
        /// Check if user has a specific permission from database
        /// </summary>
        private async Task<bool> HasPermissionAsync(ApplicationUser user, string permission)
        {
            var roles = await _userManager.GetRolesAsync(user);
            
            var hasPermission = await _context.RolePermissions
                .Where(rp => roles.Contains(rp.RoleName))
                .AnyAsync(rp => rp.Permission == permission);
            
            return hasPermission;
        }

        private async Task<bool> CanEditUnitAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            if (await IsAdminAsync(user))
                return true;

            // Check if user is UnitAdmin - check their assigned units via UserUnitAssignments
            if (await IsUnitAdminAsync(user))
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                var unitIdsWithChildren = await GetUnitIdsWithChildrenAsync(assignedUnitIds);
                return unitIdsWithChildren.Contains(unitId);
            }

            // Check if user has access to this unit via UserUnitAssignments
            return await _context.UserUnitAssignments
                .AnyAsync(a => a.UserId == userId.ToString() && a.UnitId == unitId);
        }

        private async Task<long[]> GetUnitAndChildUnitIdsAsync(long unitId)
        {
            var unitIds = new List<long> { unitId };
            var childUnits = await _context.Units.Where(u => u.ParentUnitId == unitId).ToListAsync();
            foreach (var child in childUnits)
            {
                unitIds.Add(child.Id);
                unitIds.AddRange(await GetUnitAndChildUnitIdsAsync(child.Id));
            }
            return unitIds.ToArray();
        }

        private async Task<long[]> GetAssignedUnitIdsAsync(Guid userId)
        {
            var assignments = await _context.UserUnitAssignments
                .Where(ua => ua.UserId == userId.ToString())
                .Select(ua => ua.UnitId)
                .ToListAsync();
            return assignments.ToArray();
        }

        private async Task<long[]> GetUnitIdsWithChildrenAsync(long[] unitIds)
        {
            var allUnitIds = new HashSet<long>(unitIds);
            
            // Recursively add child units for each unit
            foreach (var unitId in unitIds)
            {
                var childUnitIds = await GetUnitAndChildUnitIdsAsync(unitId);
                foreach (var childId in childUnitIds)
                {
                    allUnitIds.Add(childId);
                }
            }
            
            return allUnitIds.ToArray();
        }

        private int CountIPsIncludingChildren(long unitId, List<Unit> allUnits)
        {
            var unit = allUnits.FirstOrDefault(u => u.Id == unitId);
            if (unit == null)
                return 0;

            var count = unit.IPAddresses.Count;
            
            // Count IPs from child units recursively
            var childUnits = allUnits.Where(u => u.ParentUnitId == unitId).ToList();
            foreach (var child in childUnits)
            {
                count += CountIPsIncludingChildren(child.Id, allUnits);
            }
            
            return count;
        }

        private int CountIPsForUnit(long unitId)
        {
            // Get all unit IDs including children recursively
            var allChildUnitIds = GetAllChildUnitIds(unitId);
            
            // Count IPs for this unit and all child units
            var totalIpCount = _context.IPAddresses
                .Where(ip => ip.UnitId == unitId || allChildUnitIds.Contains(ip.UnitId))
                .Count();
            
            return totalIpCount;
        }

        private HashSet<long> GetAllChildUnitIds(long unitId)
        {
            var childIds = new HashSet<long>();
            var queue = new Queue<long>();
            queue.Enqueue(unitId);
            
            while (queue.Count > 0)
            {
                var currentId = queue.Dequeue();
                var children = _context.Units.Where(u => u.ParentUnitId == currentId).Select(u => u.Id);
                foreach (var childId in children)
                {
                    childIds.Add(childId);
                    queue.Enqueue(childId);
                }
            }
            
            return childIds;
        }

        private UnitTreeDto BuildUnitTree(Unit unit)
        {
            var allUnits = GetAllUnitsRecursively(unit);
            var ipAddressCount = CountIPsIncludingChildren(unit.Id, allUnits);
            
            return new UnitTreeDto
            {
                Id = unit.Id,
                ExternalId = unit.ExternalId,
                Name = unit.Name,
                Code = unit.Code,
                IPAddressCount = ipAddressCount,
                ChildUnits = unit.ChildUnits?.Select(BuildUnitTree).ToArray()
            };
        }
        
        private UnitTreeDto BuildUnitTreeFiltered(Unit unit, long[] assignedUnitIds)
        {
            var allUnits = GetAllUnitsRecursively(unit);
            var ipAddressCount = CountIPsIncludingChildren(unit.Id, allUnits);
            
            // Filter child units to only include assigned units
            var filteredChildUnits = unit.ChildUnits?
                .Where(c => assignedUnitIds.Contains(c.Id))
                .Select(c => BuildUnitTreeFiltered(c, assignedUnitIds))
                .ToArray();
            
            return new UnitTreeDto
            {
                Id = unit.Id,
                ExternalId = unit.ExternalId,
                Name = unit.Name,
                Code = unit.Code,
                IPAddressCount = ipAddressCount,
                ChildUnits = filteredChildUnits
            };
        }
        
        private List<Unit> GetAllUnitsRecursively(Unit rootUnit)
        {
            var allUnits = new List<Unit> { rootUnit };
            if (rootUnit.ChildUnits != null)
            {
                foreach (var child in rootUnit.ChildUnits)
                {
                    allUnits.AddRange(GetAllUnitsRecursively(child));
                }
            }
            return allUnits;
        }

        public async Task<UnitSelectionDto[]> GetAllUnitsForSelectionAsync()
        {
            var units = await _context.Units
                .OrderBy(u => u.Name)
                .ToListAsync();

            return units.Select(u => new UnitSelectionDto
            {
                Id = u.Id,
                Name = u.Name,
                Code = u.Code
            }).ToArray();
        }

        /// <summary>
        /// Gửi notification đến tất cả user liên quan đến unit khi có thay đổi
        /// </summary>
        public async Task NotifyUnitChangeAsync(long unitId, string action, string? updatedBy)
        {
            try
            {
                // Lấy thông tin unit
                var unit = await _context.Units.FindAsync(unitId);
                if (unit == null)
                    return;

                // Tìm tất cả user được gán vào unit này
                var assignments = await _context.UserUnitAssignments
                    .Where(a => a.UnitId == unitId)
                    .ToListAsync();

                if (assignments.Count == 0)
                    return;

                // Tạo notification
                var notification = new UnitUpdateNotificationDto
                {
                    UnitId = unit.Id,
                    UnitName = unit.Name,
                    Action = action,
                    UpdatedAt = DateTime.UtcNow,
                    UpdatedBy = updatedBy
                };

                // Gửi notification đến từng user
                foreach (var assignment in assignments)
                {
                    await _hubContext.Clients.User(assignment.UserId)
                        .SendAsync("UnitUpdated", notification);
                }

                _logger.LogInformation($"Sent unit change notification for unit '{unit.Name}' (ID: {unitId}) - Action: {action}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send unit change notification for unit ID '{UnitId}'", unitId);
                }
            }
            
            public async Task UpdateUnitDisplayOrderAsync(Guid userId, Dictionary<long, int> unitOrderMap)
            {
                var user = await _context.Users.FindAsync(userId.ToString());
                if (user == null)
                    throw new UnauthorizedAccessException("User not found");
                
                if (!await HasPermissionAsync(user, Permissions.UnitUpdate))
                    throw new UnauthorizedAccessException("You do not have permission to update unit display order");
                
                // Update display order for each unit
                foreach (var kvp in unitOrderMap)
                {
                    var unit = await _context.Units.FindAsync(kvp.Key);
                    if (unit != null)
                    {
                        unit.DisplayOrder = kvp.Value;
                        unit.UpdatedAt = DateTime.UtcNow;
                    }
                }
                
                await _context.SaveChangesAsync();
                
                // Gửi notification
                var currentUser = await _userManager.FindByIdAsync(userId.ToString());
                var updatedBy = currentUser?.UserName ?? "Unknown";
                
                // Gửi notification cho tất cả units đã cập nhật
                foreach (var unitId in unitOrderMap.Keys)
                {
                    await NotifyUnitChangeAsync(unitId, "OrderUpdated", updatedBy);
                }
            }
        }
    }