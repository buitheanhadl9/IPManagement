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
    public interface INetworkSystemService
    {
        Task<NetworkSystemListResponse> GetNetworkSystemsAsync(Guid userId, int pageNumber, int pageSize, string? searchTerm, string? status);
        Task<NetworkSystemDto?> GetNetworkSystemByIdAsync(Guid userId, long systemId);
        Task<NetworkSystemDto> CreateNetworkSystemAsync(Guid userId, NetworkSystemCreateRequest request);
        Task<NetworkSystemDto?> UpdateNetworkSystemAsync(Guid userId, long systemId, NetworkSystemUpdateRequest request);
        Task<bool> DeleteNetworkSystemAsync(Guid userId, long systemId);
        Task<NetworkSystemDto[]> GetAvailableIpAddressesAsync(Guid userId, long systemId);
        Task<NetworkSystemDto[]> GetNetworkSystemsByIpAddressAsync(Guid userId, long ipId);
        Task<bool> AssignIpAddressAsync(Guid userId, AssignIpAddressRequest request);
        Task<bool> RemoveIpAddressAsync(Guid userId, RemoveIpAddressRequest request);
    }

    public class NetworkSystemService : INetworkSystemService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public NetworkSystemService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<NetworkSystemListResponse> GetNetworkSystemsAsync(Guid userId, int pageNumber, int pageSize, string? searchTerm, string? status)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.ToString());
            if (user == null)
                return new NetworkSystemListResponse { Items = Array.Empty<NetworkSystemDto>() };

            var query = _context.NetworkSystems
                .Include(ns => ns.IpAddresses)
                    .ThenInclude(nsi => nsi.IpAddress)
                .AsQueryable();

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(ns => 
                    ns.Name.Contains(searchTerm) ||
                    (ns.Code != null && ns.Code.Contains(searchTerm)) ||
                    (ns.Description != null && ns.Description.Contains(searchTerm)));
            }

            // Apply status filter
            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(ns => ns.Status == status);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(ns => new NetworkSystemDto
                {
                    Id = ns.Id,
                    ExternalId = ns.ExternalId,
                    Name = ns.Name,
                    Code = ns.Code,
                    Description = ns.Description,
                    Status = ns.Status,
                    CreatedAt = ns.CreatedAt,
                    UpdatedAt = ns.UpdatedAt,
                    CreatedBy = ns.CreatedBy,
                    UpdatedBy = ns.UpdatedBy,
                    IpAddresses = ns.IpAddresses
                        .Where(nsi => nsi.IpAddress != null)
                        .Select(nsi => new IPAddressDto
                        {
                            Id = nsi.IpAddress.Id,
                            ExternalId = nsi.IpAddress.ExternalId,
                            UnitId = nsi.IpAddress.UnitId,
                            UnitName = nsi.IpAddress.Unit != null ? nsi.IpAddress.Unit.Name : null,
                            IpAddress = nsi.IpAddress.IpAddress,
                            MacAddress = nsi.IpAddress.MacAddress,
                            DeviceName = nsi.IpAddress.DeviceName,
                            DeviceType = nsi.IpAddress.DeviceType,
                            Port = nsi.IpAddress.Port,
                            Description = nsi.IpAddress.Description,
                            Status = nsi.IpAddress.Status,
                            CreatedAt = nsi.IpAddress.CreatedAt,
                            UpdatedAt = nsi.IpAddress.UpdatedAt,
                            IsOnline = nsi.IpAddress.IsOnline,
                            LastPingTime = nsi.IpAddress.LastPingTime
                        })
                        .ToArray()
                })
                .ToArrayAsync();

            return new NetworkSystemListResponse
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<NetworkSystemDto?> GetNetworkSystemByIdAsync(Guid userId, long systemId)
        {
            var networkSystem = await _context.NetworkSystems
                .Include(ns => ns.IpAddresses)
                    .ThenInclude(nsi => nsi.IpAddress)
                .FirstOrDefaultAsync(ns => ns.Id == systemId);

            if (networkSystem == null)
                return null;

            return new NetworkSystemDto
            {
                Id = networkSystem.Id,
                ExternalId = networkSystem.ExternalId,
                Name = networkSystem.Name,
                Code = networkSystem.Code,
                Description = networkSystem.Description,
                Status = networkSystem.Status,
                CreatedAt = networkSystem.CreatedAt,
                UpdatedAt = networkSystem.UpdatedAt,
                CreatedBy = networkSystem.CreatedBy,
                UpdatedBy = networkSystem.UpdatedBy,
                IpAddresses = networkSystem.IpAddresses
                    .Where(nsi => nsi.IpAddress != null)
                    .Select(nsi => new IPAddressDto
                    {
                        Id = nsi.IpAddress.Id,
                        ExternalId = nsi.IpAddress.ExternalId,
                        UnitId = nsi.IpAddress.UnitId,
                        UnitName = nsi.IpAddress.Unit != null ? nsi.IpAddress.Unit.Name : null,
                        IpAddress = nsi.IpAddress.IpAddress,
                        MacAddress = nsi.IpAddress.MacAddress,
                        DeviceName = nsi.IpAddress.DeviceName,
                        DeviceType = nsi.IpAddress.DeviceType,
                        Port = nsi.IpAddress.Port,
                        Description = nsi.IpAddress.Description,
                        Status = nsi.IpAddress.Status,
                        CreatedAt = nsi.IpAddress.CreatedAt,
                        UpdatedAt = nsi.IpAddress.UpdatedAt,
                        IsOnline = nsi.IpAddress.IsOnline,
                        LastPingTime = nsi.IpAddress.LastPingTime
                    })
                    .ToArray()
            };
        }

        public async Task<NetworkSystemDto> CreateNetworkSystemAsync(Guid userId, NetworkSystemCreateRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.ToString());
            if (user == null)
                throw new InvalidOperationException("User not found");

            var networkSystem = new NetworkSystem
            {
                Name = request.Name,
                Code = request.Code,
                Description = request.Description,
                Status = request.Status,
                CreatedBy = user.Id
            };

            _context.NetworkSystems.Add(networkSystem);
            await _context.SaveChangesAsync();

            return await GetNetworkSystemByIdAsync(userId, networkSystem.Id) ?? 
                   throw new InvalidOperationException("Failed to create network system");
        }

        public async Task<NetworkSystemDto?> UpdateNetworkSystemAsync(Guid userId, long systemId, NetworkSystemUpdateRequest request)
        {
            var networkSystem = await _context.NetworkSystems.FindAsync(systemId);
            if (networkSystem == null)
                return null;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.ToString());
            if (user == null)
                throw new InvalidOperationException("User not found");

            if (request.Name != null) networkSystem.Name = request.Name;
            if (request.Code != null) networkSystem.Code = request.Code;
            if (request.Description != null) networkSystem.Description = request.Description;
            if (request.Status != null) networkSystem.Status = request.Status;
            
            networkSystem.UpdatedAt = DateTime.UtcNow;
            networkSystem.UpdatedBy = user.Id;

            await _context.SaveChangesAsync();

            return await GetNetworkSystemByIdAsync(userId, systemId);
        }

        public async Task<bool> DeleteNetworkSystemAsync(Guid userId, long systemId)
        {
            var networkSystem = await _context.NetworkSystems.FindAsync(systemId);
            if (networkSystem == null)
                return false;

            _context.NetworkSystems.Remove(networkSystem);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<NetworkSystemDto[]> GetAvailableIpAddressesAsync(Guid userId, long systemId)
        {
            var networkSystem = await _context.NetworkSystems
                .Include(ns => ns.IpAddresses)
                .FirstOrDefaultAsync(ns => ns.Id == systemId);

            if (networkSystem == null)
                return Array.Empty<NetworkSystemDto>();

            // Get all IP addresses
            var allIps = await _context.IPAddresses.ToListAsync();
            // Get already assigned IP IDs
            var assignedIpIds = networkSystem.IpAddresses.Select(nsi => nsi.IpAddressId).ToHashSet();
            // Filter to available IPs
            var availableIps = allIps.Where(ip => !assignedIpIds.Contains(ip.Id)).ToList();

            return availableIps.Select(ip => new NetworkSystemDto
            {
                Id = ip.Id,
                ExternalId = ip.ExternalId,
                Name = ip.DeviceName ?? ip.IpAddress,
                Code = ip.DeviceType,
                Description = ip.Description,
                Status = ip.Status,
                CreatedAt = ip.CreatedAt,
                UpdatedAt = ip.UpdatedAt,
                IpAddresses = new[]
                {
                    new IPAddressDto
                    {
                        Id = ip.Id,
                        ExternalId = ip.ExternalId,
                        UnitId = ip.UnitId,
                        UnitName = ip.Unit?.Name,
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
                    }
                }
            }).ToArray();
        }

        public async Task<NetworkSystemDto[]> GetNetworkSystemsByIpAddressAsync(Guid userId, long ipId)
        {
            var networkSystems = await _context.NetworkSystems
                .Include(ns => ns.IpAddresses)
                    .ThenInclude(nsi => nsi.IpAddress)
                .Where(ns => ns.IpAddresses.Any(nsi => nsi.IpAddressId == ipId))
                .ToListAsync();

            return networkSystems.Select(ns => new NetworkSystemDto
            {
                Id = ns.Id,
                ExternalId = ns.ExternalId,
                Name = ns.Name,
                Code = ns.Code,
                Description = ns.Description,
                Status = ns.Status,
                CreatedAt = ns.CreatedAt,
                UpdatedAt = ns.UpdatedAt,
                CreatedBy = ns.CreatedBy,
                UpdatedBy = ns.UpdatedBy,
                IpAddresses = ns.IpAddresses
                    .Where(nsi => nsi.IpAddress != null)
                    .Select(nsi => new IPAddressDto
                    {
                        Id = nsi.IpAddress.Id,
                        ExternalId = nsi.IpAddress.ExternalId,
                        UnitId = nsi.IpAddress.UnitId,
                        UnitName = nsi.IpAddress.Unit != null ? nsi.IpAddress.Unit.Name : null,
                        IpAddress = nsi.IpAddress.IpAddress,
                        MacAddress = nsi.IpAddress.MacAddress,
                        DeviceName = nsi.IpAddress.DeviceName,
                        DeviceType = nsi.IpAddress.DeviceType,
                        Port = nsi.IpAddress.Port,
                        Description = nsi.IpAddress.Description,
                        Status = nsi.IpAddress.Status,
                        CreatedAt = nsi.IpAddress.CreatedAt,
                        UpdatedAt = nsi.IpAddress.UpdatedAt,
                        IsOnline = nsi.IpAddress.IsOnline,
                        LastPingTime = nsi.IpAddress.LastPingTime
                    })
                    .ToArray()
            }).ToArray();
        }

        public async Task<bool> AssignIpAddressAsync(Guid userId, AssignIpAddressRequest request)
        {
            var networkSystem = await _context.NetworkSystems.FindAsync(request.NetworkSystemId);
            if (networkSystem == null)
                return false;

            var ipAddress = await _context.IPAddresses.FindAsync(request.IpAddressId);
            if (ipAddress == null)
                return false;

            // Check if already assigned
            var existing = await _context.NetworkSystemIpAddresses
                .FirstOrDefaultAsync(nsi => nsi.NetworkSystemId == request.NetworkSystemId && 
                                           nsi.IpAddressId == request.IpAddressId);
            if (existing != null)
                return true; // Already assigned

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.ToString());
            if (user == null)
                throw new InvalidOperationException("User not found");

            var networkSystemIpAddress = new NetworkSystemIpAddress
            {
                NetworkSystemId = request.NetworkSystemId,
                IpAddressId = request.IpAddressId,
                CreatedBy = user.Id
            };

            _context.NetworkSystemIpAddresses.Add(networkSystemIpAddress);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> RemoveIpAddressAsync(Guid userId, RemoveIpAddressRequest request)
        {
            var networkSystemIpAddress = await _context.NetworkSystemIpAddresses
                .FirstOrDefaultAsync(nsi => nsi.NetworkSystemId == request.NetworkSystemId && 
                                           nsi.IpAddressId == request.IpAddressId);
            if (networkSystemIpAddress == null)
                return false;

            _context.NetworkSystemIpAddresses.Remove(networkSystemIpAddress);
            await _context.SaveChangesAsync();

            return true;
        }
    }
}