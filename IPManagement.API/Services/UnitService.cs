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

            var isAdmin = await IsAdminAsync(user);
            var isUnitAdmin = await IsUnitAdminAsync(user);

            var query = _context.Units
                .Include(u => u.ParentUnit)
                .AsQueryable();

            if (!isAdmin && isUnitAdmin)
            {
                // UnitAdmin có thể xem đơn vị được gán và các đơn vị con
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (assignedUnitIds.Any())
                {
                    var allAccessibleUnitIds = new HashSet<long>();
                    foreach (var unitId in assignedUnitIds)
                    {
                        allAccessibleUnitIds.Add(unitId);
                        var childIds = await GetUnitAndChildUnitIdsAsync(unitId);
                        foreach (var childId in childIds)
                        {
                            allAccessibleUnitIds.Add(childId);
                        }
                    }
                    query = query.Where(u => allAccessibleUnitIds.Contains(u.Id));
                }
                else
                {
                    return Array.Empty<UnitDto>();
                }
            }
            else if (!isAdmin)
            {
                if (user.UnitId.HasValue)
                {
                    query = query.Where(u => u.Id == user.UnitId.Value);
                }
                else
                {
                    return Array.Empty<UnitDto>();
                }
            }

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

            var isAdmin = await IsAdminAsync(user);
            var isUnitAdmin = await IsUnitAdminAsync(user);

            if (isAdmin)
            {
                var rootUnits = await _context.Units
                    .Where(u => u.ParentUnitId == null)
                    .Include(u => u.ChildUnits)
                    .ToListAsync();

                return rootUnits.Select(u => BuildUnitTree(u)).ToArray();
            }

            if (isUnitAdmin)
            {
                var assignedUnitIds = await GetAssignedUnitIdsAsync(userId);
                if (assignedUnitIds.Any())
                {
                    var result = new List<UnitTreeDto>();
                    foreach (var unitId in assignedUnitIds)
                    {
                        var unit = await _context.Units
                            .Include(u => u.ChildUnits)
                            .FirstOrDefaultAsync(u => u.Id == unitId);
                        if (unit != null)
                        {
                            result.Add(BuildUnitTree(unit));
                        }
                    }
                    return result.ToArray();
                }
            }

            if (user.UnitId.HasValue)
            {
                var unit = await _context.Units
                    .Include(u => u.ChildUnits)
                    .FirstOrDefaultAsync(u => u.Id == user.UnitId.Value);

                if (unit != null)
                {
                    return new[] { BuildUnitTree(unit) };
                }
            }

            return Array.Empty<UnitTreeDto>();
        }

        public async Task<UnitDto?> GetUnitByIdAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return null;

            if (!await CanAccessUnitAsync(userId, unitId))
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
                ChildUnits = unit.ChildUnits.Select(c => new UnitDto
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

            if (!await IsAdminAsync(user))
                throw new UnauthorizedAccessException("Only admins can create units");

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

            if (!await CanEditUnitAsync(userId, unitId))
                throw new UnauthorizedAccessException("You do not have permission to update this unit");

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

            if (!await IsAdminAsync(user))
                throw new UnauthorizedAccessException("Only admins can delete units");

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
    }
}