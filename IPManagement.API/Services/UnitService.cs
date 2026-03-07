using IPManagement.API.Data;
using IPManagement.API.DTOs;
using IPManagement.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
    }

    public class UnitService : IUnitService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public UnitService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
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

            // Get assigned unit IDs for the user (applies to all users including Admin)
            var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
            
            // If user has no assigned units, return empty array
            if (assignedUnitIds.Length == 0)
            {
                return Array.Empty<UnitDto>();
            }

            // Include child units of assigned units
            var unitIdsWithChildren = await GetUnitIdsWithChildrenAsync(assignedUnitIds);

            // Return only assigned units and their children
            var query = _context.Units
                .Include(u => u.ParentUnit)
                .Where(u => unitIdsWithChildren.Contains(u.Id))
                .AsQueryable();

            var units = await query.OrderBy(u => u.Name).ToListAsync();
            
            // Get all units for counting IPs including child units (with IP addresses loaded)
            var allUnits = await _context.Units
                .Include(u => u.ChildUnits)
                .Include(u => u.IPAddresses)
                .ToListAsync();
            
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
                IPAddressCount = CountIPsIncludingChildren(u.Id, allUnits)
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

            // Get assigned unit IDs for the user (applies to all users including Admin)
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

            // Get assigned unit IDs for the user (applies to all users including Admin)
            var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
            
            // If user has no assigned units or the requested unit is not assigned, return null
            if (assignedUnitIds.Length == 0 || !assignedUnitIds.Contains(unitId))
                return null;

            var unit = await _context.Units
                .Include(u => u.ParentUnit)
                .Include(u => u.ChildUnits)
                .FirstOrDefaultAsync(u => u.Id == unitId);

            if (unit == null)
                return null;

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
                ChildUnits = unit.ChildUnits
                    .Where(c => assignedUnitIds.Contains(c.Id))
                    .Select(c => new UnitDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Code = c.Code
                    }).ToArray(),
                IPAddressCount = unit.IPAddresses.Count
            };
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
                IsActive = true
            };

            _context.Units.Add(unit);
            await _context.SaveChangesAsync();

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
                IsActive = unit.IsActive
            };
        }

        public async Task<UnitDto?> UpdateUnitAsync(Guid userId, long unitId, UnitUpdateRequest request)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return null;

            if (!await HasPermissionAsync(user, Permissions.UnitUpdate))
                throw new UnauthorizedAccessException("You do not have permission to update units");

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
            unit.Address = request.Address;
            unit.ParentUnitId = request.ParentUnitId;
            unit.Description = request.Description;
            unit.Note = request.Note;
            unit.IsActive = request.IsActive;
            unit.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

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
                IsActive = unit.IsActive
            };
        }

        public async Task<bool> DeleteUnitAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            if (!await HasPermissionAsync(user, Permissions.UnitDelete))
                throw new UnauthorizedAccessException("You do not have permission to delete units");

            var unit = await _context.Units
                .Include(u => u.ChildUnits)
                .Include(u => u.IPAddresses)
                .Include(u => u.Users)
                .FirstOrDefaultAsync(u => u.Id == unitId);

            if (unit == null)
                return false;

            if (unit.ChildUnits.Any())
                throw new InvalidOperationException("Cannot delete unit with child units. Please delete or reassign child units first.");

            if (unit.IPAddresses.Any())
                throw new InvalidOperationException("Cannot delete unit with IP addresses. Please delete or reassign IP addresses first.");

            if (unit.Users.Any())
                throw new InvalidOperationException($"Cannot delete unit because {unit.Users.Count} user(s) are assigned to this unit. Please reassign users to a different unit first.");

            _context.Units.Remove(unit);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<UnitDto> GetMyUnitAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null || user.UnitId == null)
                throw new UnauthorizedAccessException("User does not belong to any unit");

            var unit = await _context.Units.FindAsync(user.UnitId.Value);
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
                IPAddressCount = unit.IPAddresses.Count
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

            if (await IsUnitAdminAsync(user))
            {
                var unitIds = await GetUnitAndChildUnitIdsAsync(user.UnitId.Value);
                return unitIds.Contains(unitId);
            }

            return user.UnitId == unitId;
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

            if (await IsUnitAdminAsync(user))
            {
                var unitIds = await GetUnitAndChildUnitIdsAsync(user.UnitId.Value);
                return unitIds.Contains(unitId);
            }

            return false;
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
    }
}