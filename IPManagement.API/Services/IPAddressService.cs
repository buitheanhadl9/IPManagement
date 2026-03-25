using IPManagement.API.Data;
using IPManagement.API.DTOs;
using IPManagement.API.Models;
using IPManagement.API.Extensions;
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
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.ToString());
            if (user == null)
                return new IPAddressListResponse { Items = Array.Empty<IPAddressDto>() };

            var query = _context.IPAddresses
                .Include(ip => ip.Unit).ThenInclude(u => u.ParentUnit)
                .AsQueryable();

            // Load user unit assignments
            await _context.Entry(user)
                .Collection(u => u.UserUnitAssignments)
                .Query()
                .Include(ua => ua.Unit)
                .LoadAsync();

            var userRoles = await _userManager.GetRolesAsync(user);
            var isAdmin = userRoles.Contains("Admin");
            var isUnitAdmin = userRoles.Contains("UnitAdmin");
            
            // Kiểm tra quyền IP_READ - user cần có quyền này mới được xem IP
            var hasIpReadPermission = await _userManager.HasPermissionAsync(user, "ip_address:view", _context);
            
            // Nếu không có quyền IP_READ và không phải admin, trả về danh sách rỗng
            if (!hasIpReadPermission && !isAdmin)
            {
                return new IPAddressListResponse { Items = Array.Empty<IPAddressDto>() };
            }
            
            // Nếu không phải admin, giới hạn theo units được gán
            if (!isAdmin)
            {
                var userUnitIds = user.UserUnitAssignments.Select(ua => ua.UnitId).ToArray();
                
                if (userUnitIds.Length == 0)
                {
                    return new IPAddressListResponse { Items = Array.Empty<IPAddressDto>() };
                }
                
                // UnitAdmin: xem được unit và child units
                if (isUnitAdmin)
                {
                    var allAllowedUnitIds = new HashSet<long>();
                    foreach (var uId in userUnitIds)
                    {
                        var childUnitIds = await GetUnitAndChildUnitIdsAsync(uId);
                        foreach (var id in childUnitIds)
                        {
                            allAllowedUnitIds.Add(id);
                        }
                    }
                    query = query.Where(ip => allAllowedUnitIds.Contains(ip.UnitId));
                }
                else
                {
                    // User: chỉ xem được units được gán
                    query = query.Where(ip => userUnitIds.Contains(ip.UnitId));
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
                .Include(ip => ip.Unit).ThenInclude(u => u.ParentUnit)
                .Include(ip => ip.NetworkSystems).ThenInclude(ns => ns.NetworkSystem)
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
                ParentUnitName = ip.Unit?.ParentUnit?.Name,
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
                LastPingTime = ip.LastPingTime,
                NetworkSystemId = ip.NetworkSystems.FirstOrDefault()?.NetworkSystemId,
                NetworkSystemName = ip.NetworkSystems.FirstOrDefault()?.NetworkSystem?.Name
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
                .Include(ip => ip.Unit).ThenInclude(u => u.ParentUnit)
                .Include(ip => ip.NetworkSystems).ThenInclude(ns => ns.NetworkSystem)
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
                ParentUnitName = ip.Unit?.ParentUnit?.Name,
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
                LastPingTime = ip.LastPingTime,
                NetworkSystemId = ip.NetworkSystems.FirstOrDefault()?.NetworkSystemId,
                NetworkSystemName = ip.NetworkSystems.FirstOrDefault()?.NetworkSystem?.Name
            };
        }

        public async Task<IPAddressDto> CreateIPAddressAsync(Guid userId, IPAddressCreateRequest request)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            // Load user unit assignments
            await _context.Entry(user)
                .Collection(u => u.UserUnitAssignments)
                .Query()
                .Include(ua => ua.Unit)
                .LoadAsync();

            var userRoles = await _userManager.GetRolesAsync(user);
            var isAdmin = userRoles.Contains("Admin");
            var isUnitAdmin = userRoles.Contains("UnitAdmin");
            
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
                var userUnitIds = user.UserUnitAssignments.Select(ua => ua.UnitId).ToArray();
                if (userUnitIds.Length == 0)
                    throw new UnauthorizedAccessException("User does not belong to any unit");
                
                // Use first unit if UnitId not provided
                targetUnitId = request.UnitId ?? userUnitIds[0];
                
                // Check if target unit is within allowed units (unit and child units)
                var allAllowedUnitIds = new HashSet<long>();
                foreach (var uId in userUnitIds)
                {
                    var childUnitIds = await GetUnitAndChildUnitIdsAsync(uId);
                    foreach (var id in childUnitIds)
                    {
                        allAllowedUnitIds.Add(id);
                    }
                }
                if (!allAllowedUnitIds.Contains(targetUnitId))
                    throw new UnauthorizedAccessException("You do not have permission to add IP addresses to this unit");
            }
            else
            {
                // Regular user (User role) - must have unit assignment
                var userUnitIds = user.UserUnitAssignments.Select(ua => ua.UnitId).ToArray();
                if (userUnitIds.Length == 0)
                    throw new UnauthorizedAccessException("User does not belong to any unit");
                
                targetUnitId = request.UnitId ?? userUnitIds[0];
                
                // User can only add to assigned units
                if (!userUnitIds.Contains(targetUnitId))
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

            // Assign to NetworkSystem if provided
            if (request.NetworkSystemId.HasValue)
            {
                var networkSystemExists = await _context.NetworkSystems.AnyAsync(ns => ns.Id == request.NetworkSystemId.Value);
                if (networkSystemExists)
                {
                    var networkSystemIpAddress = new NetworkSystemIpAddress
                    {
                        NetworkSystemId = request.NetworkSystemId.Value,
                        IpAddressId = ipRecord.Id,
                        CreatedBy = userId.ToString(),
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.NetworkSystemIpAddresses.Add(networkSystemIpAddress);
                    await _context.SaveChangesAsync();
                }
            }

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
            var ip = await _context.IPAddresses
                .Include(ip => ip.NetworkSystems)
                .FirstOrDefaultAsync(ip => ip.Id == ipId);
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

            // Update NetworkSystem assignment
            if (request.NetworkSystemId.HasValue)
            {
                // Remove existing network system assignments
                var existingAssignments = ip.NetworkSystems.ToList();
                foreach (var assignment in existingAssignments)
                {
                    _context.NetworkSystemIpAddresses.Remove(assignment);
                }

                // Add new network system assignment if it exists
                var networkSystemExists = await _context.NetworkSystems.AnyAsync(ns => ns.Id == request.NetworkSystemId.Value);
                if (networkSystemExists)
                {
                    var networkSystemIpAddress = new NetworkSystemIpAddress
                    {
                        NetworkSystemId = request.NetworkSystemId.Value,
                        IpAddressId = ip.Id,
                        CreatedBy = userId.ToString(),
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.NetworkSystemIpAddresses.Add(networkSystemIpAddress);
                }
            }
            else
            {
                // Remove all network system assignments if NetworkSystemId is null
                var existingAssignments = ip.NetworkSystems.ToList();
                foreach (var assignment in existingAssignments)
                {
                    _context.NetworkSystemIpAddresses.Remove(assignment);
                }
            }

            await _context.SaveChangesAsync();

            // Reload with network system info
            ip = await _context.IPAddresses
                .Include(ip => ip.NetworkSystems).ThenInclude(ns => ns.NetworkSystem)
                .FirstOrDefaultAsync(ip => ip.Id == ipId);

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
                IsOnline = ip.IsOnline,
                NetworkSystemId = ip.NetworkSystems.FirstOrDefault()?.NetworkSystemId,
                NetworkSystemName = ip.NetworkSystems.FirstOrDefault()?.NetworkSystem?.Name
            };
        }

        public async Task<bool> DeleteIPAddressAsync(Guid userId, long ipId)
        {
            if (!await CanDeleteIPAddressAsync(userId, ipId))
                throw new UnauthorizedAccessException("You do not have permission to delete this IP address");

            var ip = await _context.IPAddresses.FindAsync(ipId);
            if (ip == null)
                return false;

            // Remove associated NetworkSystemIpAddress records
            var networkSystemAssignments = await _context.NetworkSystemIpAddresses
                .Where(ns => ns.IpAddressId == ipId)
                .ToListAsync();
            _context.NetworkSystemIpAddresses.RemoveRange(networkSystemAssignments);

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
                .Include(ip => ip.Unit).ThenInclude(u => u.ParentUnit)
                .AsQueryable();

            if (!await IsAdminAsync(user))
            {
                // Get user's assigned units via UserUnitAssignments
                var userUnitIds = user.UserUnitAssignments.Select(ua => ua.UnitId).ToArray();
                
                if (userUnitIds.Length > 0)
                {
                    if (await IsUnitAdminAsync(user))
                    {
                        // UnitAdmin can access unit and child units
                        var allAllowedUnitIds = new HashSet<long>();
                        foreach (var uId in userUnitIds)
                        {
                            var childUnitIds = await GetUnitAndChildUnitIdsAsync(uId);
                            foreach (var id in childUnitIds)
                            {
                                allAllowedUnitIds.Add(id);
                            }
                        }
                        query = query.Where(ip => allAllowedUnitIds.Contains(ip.UnitId));
                    }
                    else
                    {
                        // Regular user can only access assigned units
                        query = query.Where(ip => userUnitIds.Contains(ip.UnitId));
                    }
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
                    UnitName = ip.Unit == null ? null : ip.Unit.Name,
                    ParentUnitName = ip.Unit?.ParentUnit?.Name
                })
                .ToArray();

            return duplicates;
        }

        public async Task<bool> CanManageUnitAsync(Guid userId, long unitId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            var userRoles = await _userManager.GetRolesAsync(user);
            if (userRoles.Contains("Admin"))
                return true;

            // Load user unit assignments
            await _context.Entry(user)
                .Collection(u => u.UserUnitAssignments)
                .Query()
                .Include(ua => ua.Unit)
                .LoadAsync();

            var userUnitIds = user.UserUnitAssignments.Select(ua => ua.UnitId).ToArray();
            if (userUnitIds.Length == 0)
                return false;

            if (userRoles.Contains("UnitAdmin"))
            {
                // UnitAdmin can manage unit and child units
                var allAllowedUnitIds = new HashSet<long>();
                foreach (var uId in userUnitIds)
                {
                    var childUnitIds = await GetUnitAndChildUnitIdsAsync(uId);
                    foreach (var id in childUnitIds)
                    {
                        allAllowedUnitIds.Add(id);
                    }
                }
                return allAllowedUnitIds.Contains(unitId);
            }

            // User can only view assigned units, not manage
            return userUnitIds.Contains(unitId) && userRoles.Contains("Admin") || userRoles.Contains("UnitAdmin");
        }

        private async Task<bool> CanAccessIPAddressAsync(Guid userId, long ipId)
        {
            var ip = await _context.IPAddresses.Include(ip => ip.Unit).FirstOrDefaultAsync(ip => ip.Id == ipId);
            if (ip == null)
                return false;

            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            // Load user unit assignments
            await _context.Entry(user)
                .Collection(u => u.UserUnitAssignments)
                .Query()
                .Include(ua => ua.Unit)
                .LoadAsync();

            var userRoles = await _userManager.GetRolesAsync(user);
            var isAdmin = userRoles.Contains("Admin");
            var isUnitAdmin = userRoles.Contains("UnitAdmin");

            if (isAdmin)
                return true;

            var userUnitIds = user.UserUnitAssignments.Select(ua => ua.UnitId).ToArray();
            if (userUnitIds.Length == 0)
                return false;

            if (isUnitAdmin)
            {
                // UnitAdmin can access unit and child units
                var allAllowedUnitIds = new HashSet<long>();
                foreach (var uId in userUnitIds)
                {
                    var childUnitIds = await GetUnitAndChildUnitIdsAsync(uId);
                    foreach (var id in childUnitIds)
                    {
                        allAllowedUnitIds.Add(id);
                    }
                }
                return allAllowedUnitIds.Contains(ip.UnitId);
            }

            // User can only access assigned units
            return userUnitIds.Contains(ip.UnitId);
        }

        private async Task<bool> CanEditIPAddressAsync(Guid userId, long ipId)
        {
            var user = await _context.Users.FindAsync(userId.ToString());
            if (user == null)
                return false;

            var userRoles = await _userManager.GetRolesAsync(user);
            
            // Admin can edit all IP addresses
            if (userRoles.Contains("Admin"))
                return true;
            
            // Get the IP address to check its unit
            var ip = await _context.IPAddresses.Include(ip => ip.Unit).FirstOrDefaultAsync(ip => ip.Id == ipId);
            if (ip == null)
                return false;

            // Load user unit assignments
            await _context.Entry(user)
                .Collection(u => u.UserUnitAssignments)
                .Query()
                .Include(ua => ua.Unit)
                .LoadAsync();

            var userUnitIds = user.UserUnitAssignments.Select(ua => ua.UnitId).ToArray();
            if (userUnitIds.Length == 0)
                return false;

            // UnitAdmin can edit IP addresses in their assigned units and child units
            if (userRoles.Contains("UnitAdmin"))
            {
                var allAllowedUnitIds = new HashSet<long>();
                foreach (var uId in userUnitIds)
                {
                    var childUnitIds = await GetUnitAndChildUnitIdsAsync(uId);
                    foreach (var id in childUnitIds)
                    {
                        allAllowedUnitIds.Add(id);
                    }
                }
                return allAllowedUnitIds.Contains(ip.UnitId);
            }

            // Regular user cannot edit IP addresses (only view)
            return false;
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