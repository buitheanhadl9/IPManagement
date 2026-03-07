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
    public interface IIPAddressService
    {
        Task<IPAddressListResponse> GetIPAddressesAsync(Guid userId, int pageNumber, int pageSize, string? searchTerm, long? unitId, string? status);
        Task<IPAddressDto?> GetIPAddressByIdAsync(Guid userId, long ipId);
        Task<IPAddressDto> CreateIPAddressAsync(Guid userId, IPAddressCreateRequest request);
        Task<IPAddressDto?> UpdateIPAddressAsync(Guid userId, long ipId, IPAddressUpdateRequest request);
        Task<bool> DeleteIPAddressAsync(Guid userId, long ipId);
        Task<IPAddressDto[]> CheckStatusAsync(Guid userId, CheckIPStatusRequest request);
        Task<IPAddressDto[]> GetDuplicatesAsync(Guid userId);
        Task<bool> CanManageUnitAsync(Guid userId, long unitId);
    }

    public class IPAddressService : IIPAddressService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public IPAddressService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<IPAddressListResponse> GetIPAddressesAsync(Guid userId, int pageNumber, int pageSize, string? searchTerm, long? unitId, string? status)
        {
            var user = await _context.Users.Include(u => u.Unit).FirstOrDefaultAsync(u => u.Id == userId.ToString());
            if (user == null)
                return new IPAddressListResponse { Items = Array.Empty<IPAddressDto>() };

            var query = _context.IPAddresses
                .Include(ip => ip.Unit)
                .AsQueryable();

            if (!await IsAdminAsync(user))
            {
                if (await IsUnitAdminAsync(user))
                {
                    // Load user unit assignments to get primary unit
                    await _context.Entry(user)
                        .Collection(u => u.UserUnitAssignments)
                        .Query()
                        .Include(ua => ua.Unit)
                        .LoadAsync();
                    
                    var primaryUnitId = user.UserUnitAssignments
                        .Where(ua => ua.IsPrimary)
                        .Select(ua => ua.UnitId)
                        .FirstOrDefault();
                    
                    if (primaryUnitId == 0)
                        return new IPAddressListResponse { Items = Array.Empty<IPAddressDto>() };
                    
                    var unitIds = await GetUnitAndChildUnitIdsAsync(primaryUnitId);
                    query = query.Where(ip => unitIds.Contains(ip.UnitId));
                }
                else
                {
                    if (user.UnitId.HasValue)
                    {
                        query = query.Where(ip => ip.UnitId == user.UnitId.Value);
                    }
                    else
                    {
                        return new IPAddressListResponse { Items = Array.Empty<IPAddressDto>() };
                    }
                }
            }

            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(ip =>
                    ip.IpAddress.Contains(searchTerm) ||
                    (ip.DeviceName != null && ip.DeviceName.Contains(searchTerm)) ||
                    (ip.MacAddress != null && ip.MacAddress.Contains(searchTerm)));
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(ip => ip.Status == status);
            }

            if (unitId.HasValue)
            {
                query = query.Where(ip => ip.UnitId == unitId.Value);
            }

            var totalCount = await query.CountAsync();
            var ipList = await query
                .OrderByDescending(ip => ip.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = ipList.Select(ip => new IPAddressDto
            {
                Id = ip.Id,
                ExternalId = ip.ExternalId,
                UnitId = ip.UnitId,
                UnitName = ip.Unit == null ? null : ip.Unit.Name,
                IpAddress = ip.IpAddress,
                MacAddress = ip.MacAddress,
                DeviceName = ip.DeviceName,
                DeviceType = ip.DeviceType,
                Port = ip.Port,
                Description = ip.Description,
                Status = ip.Status,
                CreatedAt = ip.CreatedAt,
                UpdatedAt = ip.UpdatedAt,
                IsOnline = ip.IsOnline,
                LastPingTime = ip.LastPingTime
            }).ToArray();

            return new IPAddressListResponse
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<IPAddressDto?> GetIPAddressByIdAsync(Guid userId, long ipId)
        {
            var ip = await _context.IPAddresses
                .Include(ip => ip.Unit)
                .FirstOrDefaultAsync(ip => ip.Id == ipId);

            if (ip == null)
                return null;

            if (!await CanAccessIPAddressAsync(userId, ipId))
                return null;

            return new IPAddressDto
            {
                Id = ip.Id,
                ExternalId = ip.ExternalId,
                UnitId = ip.UnitId,
                UnitName = ip.Unit == null ? null : ip.Unit.Name,
                IpAddress = ip.IpAddress,
                MacAddress = ip.MacAddress,
                DeviceName = ip.DeviceName,
                DeviceType = ip.DeviceType,
                Port = ip.Port,
                Description = ip.Description,
                Status = ip.Status,
                CreatedAt = ip.CreatedAt,
                UpdatedAt = ip.UpdatedAt,
                IsOnline = ip.IsOnline,
                LastPingTime = ip.LastPingTime
            };
        }

        public async Task<IPAddressDto> CreateIPAddressAsync(Guid userId, IPAddressCreateRequest request)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            // Check if user has access to the target unit
            var isAdmin = await IsAdminAsync(user);
            var isUnitAdmin = await IsUnitAdminAsync(user);
            
            long targetUnitId;
            if (request.UnitId.HasValue)
            {
                targetUnitId = request.UnitId.Value;
            }
            else if (isAdmin)
            {
                if (!request.UnitId.HasValue)
                    throw new UnauthorizedAccessException("UnitId is required for admin users");
                targetUnitId = request.UnitId.Value;
            }
            else if (isUnitAdmin)
            {
                // Load user unit assignments to get primary unit
                await _context.Entry(user)
                    .Collection(u => u.UserUnitAssignments)
                    .Query()
                    .Include(ua => ua.Unit)
                    .LoadAsync();
                
                var primaryUnitId = user.UserUnitAssignments
                    .Where(ua => ua.IsPrimary)
                    .Select(ua => ua.UnitId)
                    .FirstOrDefault();
                
                if (primaryUnitId == 0)
                    throw new UnauthorizedAccessException("User does not belong to any unit");
                
                // Use primary unit if UnitId not provided
                targetUnitId = request.UnitId ?? primaryUnitId;
                
                // Check if target unit is within allowed units
                var allowedUnitIds = await GetUnitAndChildUnitIdsAsync(primaryUnitId);
                if (!allowedUnitIds.Contains(targetUnitId))
                    throw new UnauthorizedAccessException("You do not have permission to add IP addresses to this unit");
            }
            else
            {
                // Regular user - must have UnitId
                if (user.UnitId == null)
                    throw new UnauthorizedAccessException("User does not belong to any unit");
                
                targetUnitId = request.UnitId ?? user.UnitId.Value;
                
                if (user.UnitId != targetUnitId)
                    throw new UnauthorizedAccessException("You do not have permission to add IP addresses to this unit");
            }

            var exists = await _context.IPAddresses.AnyAsync(ip => ip.IpAddress == request.IpAddress && ip.UnitId == targetUnitId);
            if (exists)
                throw new InvalidOperationException("IP address already exists in this unit");

            var ipRecord = new IPAddressRecord
            {
                IpAddress = request.IpAddress,
                MacAddress = request.MacAddress,
                DeviceName = request.DeviceName,
                DeviceType = request.DeviceType,
                Port = request.Port,
                Description = request.Description,
                Status = request.Status,
                UnitId = targetUnitId,
                CreatedBy = userId.ToString(),
                UpdatedBy = userId.ToString()
            };

            _context.IPAddresses.Add(ipRecord);
            await _context.SaveChangesAsync();

            return new IPAddressDto
            {
                Id = ipRecord.Id,
                ExternalId = ipRecord.ExternalId,
                UnitId = ipRecord.UnitId,
                IpAddress = ipRecord.IpAddress,
                MacAddress = ipRecord.MacAddress,
                DeviceName = ipRecord.DeviceName,
                DeviceType = ipRecord.DeviceType,
                Port = ipRecord.Port,
                Description = ipRecord.Description,
                Status = ipRecord.Status,
                CreatedAt = ipRecord.CreatedAt,
                IsOnline = ipRecord.IsOnline
            };
        }

        public async Task<IPAddressDto?> UpdateIPAddressAsync(Guid userId, long ipId, IPAddressUpdateRequest request)
        {
            var ip = await _context.IPAddresses.FindAsync(ipId);
            if (ip == null)
                return null;

            if (!await CanEditIPAddressAsync(userId, ipId))
                throw new UnauthorizedAccessException("You do not have permission to edit this IP address");

            ip.IpAddress = request.IpAddress;
            ip.MacAddress = request.MacAddress;
            ip.DeviceName = request.DeviceName;
            ip.DeviceType = request.DeviceType;
            ip.Port = request.Port;
            ip.Description = request.Description;
            ip.Status = request.Status;
            ip.UpdatedBy = userId.ToString();
            ip.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new IPAddressDto
            {
                Id = ip.Id,
                ExternalId = ip.ExternalId,
                UnitId = ip.UnitId,
                IpAddress = ip.IpAddress,
                MacAddress = ip.MacAddress,
                DeviceName = ip.DeviceName,
                DeviceType = ip.DeviceType,
                Port = ip.Port,
                Description = ip.Description,
                Status = ip.Status,
                CreatedAt = ip.CreatedAt,
                UpdatedAt = ip.UpdatedAt,
                IsOnline = ip.IsOnline
            };
        }

        public async Task<bool> DeleteIPAddressAsync(Guid userId, long ipId)
        {
            if (!await CanDeleteIPAddressAsync(userId, ipId))
                throw new UnauthorizedAccessException("You do not have permission to delete this IP address");

            var ip = await _context.IPAddresses.FindAsync(ipId);
            if (ip == null)
                return false;

            _context.IPAddresses.Remove(ip);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IPAddressDto[]> CheckStatusAsync(Guid userId, CheckIPStatusRequest request)
        {
            var results = new List<IPAddressDto>();

            if (request.IpIds != null && request.IpIds.Length > 0)
            {
                foreach (var ipId in request.IpIds)
                {
                    if (!await CanAccessIPAddressAsync(userId, ipId))
                        continue;

                    var ip = await _context.IPAddresses.FindAsync(ipId);
                    if (ip != null)
                    {
                        var isOnline = await PingAsync(ip.IpAddress);
                        ip.IsOnline = isOnline;
                        ip.LastPingTime = DateTime.UtcNow;
                        results.Add(new IPAddressDto
                        {
                            Id = ip.Id,
                            IpAddress = ip.IpAddress,
                            DeviceName = ip.DeviceName,
                            IsOnline = isOnline,
                            LastPingTime = ip.LastPingTime
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();
            return results.ToArray();
        }

        public async Task<IPAddressDto[]> GetDuplicatesAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return Array.Empty<IPAddressDto>();

            var query = _context.IPAddresses
                .Include(ip => ip.Unit)
                .AsQueryable();

            if (!await IsAdminAsync(user))
            {
                if (await IsUnitAdminAsync(user))
                {
                    var unitIds = await GetUnitAndChildUnitIdsAsync(user.UnitId.Value);
                    query = query.Where(ip => unitIds.Contains(ip.UnitId));
                }
                else if (user.UnitId.HasValue)
                {
                    query = query.Where(ip => ip.UnitId == user.UnitId.Value);
                }
            }

            var ipList = await query.ToListAsync();
            var duplicates = ipList
                .GroupBy(ip => ip.IpAddress)
                .Where(g => g.Count() > 1)
                .SelectMany(g => g)
                .Select(ip => new IPAddressDto
                {
                    Id = ip.Id,
                    IpAddress = ip.IpAddress,
                    DeviceName = ip.DeviceName,
                    UnitName = ip.Unit == null ? null : ip.Unit.Name
                })
                .ToArray();

            return duplicates;
        }

        public async Task<bool> CanManageUnitAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            if (await IsAdminAsync(user))
                return true;

            if (await IsUnitAdminAsync(user))
            {
                // Load user unit assignments to get primary unit
                await _context.Entry(user)
                    .Collection(u => u.UserUnitAssignments)
                    .Query()
                    .Include(ua => ua.Unit)
                    .LoadAsync();
                
                var primaryUnitId = user.UserUnitAssignments
                    .Where(ua => ua.IsPrimary)
                    .Select(ua => ua.UnitId)
                    .FirstOrDefault();
                
                if (primaryUnitId == 0)
                    return false;
                
                var unitIds = await GetUnitAndChildUnitIdsAsync(primaryUnitId);
                return unitIds.Contains(unitId);
            }

            return user.UnitId == unitId;
        }

        private async Task<bool> CanAccessIPAddressAsync(Guid userId, long ipId)
        {
            var ip = await _context.IPAddresses.Include(ip => ip.Unit).FirstOrDefaultAsync(ip => ip.Id == ipId);
            if (ip == null)
                return false;

            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            if (await IsAdminAsync(user))
                return true;

            if (await IsUnitAdminAsync(user))
            {
                // Load user unit assignments to get primary unit
                await _context.Entry(user)
                    .Collection(u => u.UserUnitAssignments)
                    .Query()
                    .Include(ua => ua.Unit)
                    .LoadAsync();
                
                var primaryUnitId = user.UserUnitAssignments
                    .Where(ua => ua.IsPrimary)
                    .Select(ua => ua.UnitId)
                    .FirstOrDefault();
                
                if (primaryUnitId == 0)
                    return false;
                
                var unitIds = await GetUnitAndChildUnitIdsAsync(primaryUnitId);
                return unitIds.Contains(ip.UnitId);
            }

            return user.UnitId == ip.UnitId;
        }

        private async Task<bool> CanEditIPAddressAsync(Guid userId, long ipId)
        {
            return await CanAccessIPAddressAsync(userId, ipId);
        }

        private async Task<bool> CanDeleteIPAddressAsync(Guid userId, long ipId)
        {
            return await CanEditIPAddressAsync(userId, ipId);
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

        private async Task<bool> PingAsync(string ipAddress)
        {
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "ping",
                    Arguments = $"-n 1 -w 1000 {ipAddress}",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var process = System.Diagnostics.Process.Start(psi);
                await process.WaitForExitAsync();
                return process.ExitCode == 0;
            }
            catch
            {
                return false;
            }
        }
    }
}