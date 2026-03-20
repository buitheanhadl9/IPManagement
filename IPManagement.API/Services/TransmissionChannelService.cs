using IPManagement.API.Data;
using IPManagement.API.DTOs;
using IPManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public class TransmissionChannelService : ITransmissionChannelService
    {
        private readonly ApplicationDbContext _context;

        public TransmissionChannelService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<TransmissionChannelDto[]> GetAllChannelsAsync(Guid userId)
        {
            var channels = await _context.TransmissionChannels
                .Include(c => c.UnitAssignments)
                    .ThenInclude(ua => ua.Unit)
                .OrderBy(c => c.Code)
                .ToListAsync();

            return channels.Select(c => MapToDto(c)).ToArray();
        }

        public async Task<TransmissionChannelDto?> GetChannelByIdAsync(Guid userId, long channelId)
        {
            var channel = await _context.TransmissionChannels
                .Include(c => c.UnitAssignments)
                    .ThenInclude(ua => ua.Unit)
                .FirstOrDefaultAsync(c => c.Id == channelId);

            if (channel == null)
                return null;

            return MapToDto(channel);
        }

        public async Task<TransmissionChannelDto> CreateChannelAsync(Guid userId, TransmissionChannelCreateRequest request)
        {
            // Check if code already exists
            if (await _context.TransmissionChannels.AnyAsync(c => c.Code == request.Code))
            {
                throw new ArgumentException("Mã kênh đã tồn tại");
            }

            var channel = new TransmissionChannel
            {
                Code = request.Code,
                Provider = request.Provider,
                Bandwidth = request.Bandwidth,
                VlanId = request.VlanId,
                IpRangeStart = request.IpRangeStart,
                IpRangeEnd = request.IpRangeEnd,
                Subnet = request.Subnet,
                Gateway = request.Gateway,
                IsActive = true,
                UnitAssignments = new List<UnitTransmissionChannel>()
            };

            // Assign units if provided
            if (request.UnitIds != null && request.UnitIds.Length > 0)
            {
                var units = await _context.Units
                    .Where(u => request.UnitIds.Contains(u.Id))
                    .ToListAsync();

                foreach (var unit in units)
                {
                    channel.UnitAssignments.Add(new UnitTransmissionChannel
                    {
                        UnitId = unit.Id,
                        AssignedAt = DateTime.UtcNow,
                        AssignedBy = userId.ToString()
                    });
                }
            }

            _context.TransmissionChannels.Add(channel);
            await _context.SaveChangesAsync();

            return MapToDto(channel);
        }

        public async Task<TransmissionChannelDto> UpdateChannelAsync(Guid userId, long channelId, TransmissionChannelUpdateRequest request)
        {
            var channel = await _context.TransmissionChannels
                .Include(c => c.UnitAssignments)
                .FirstOrDefaultAsync(c => c.Id == channelId);

            if (channel == null)
                throw new KeyNotFoundException("Kênh truyền không tồn tại");

            // Check if code already exists (excluding current channel)
            if (await _context.TransmissionChannels
                .AnyAsync(c => c.Code == request.Code && c.Id != channelId))
            {
                throw new ArgumentException("Mã kênh đã tồn tại");
            }

            channel.Code = request.Code;
            channel.Provider = request.Provider;
            channel.Bandwidth = request.Bandwidth;
            channel.VlanId = request.VlanId;
            channel.IpRangeStart = request.IpRangeStart;
            channel.IpRangeEnd = request.IpRangeEnd;
            channel.Subnet = request.Subnet;
            channel.Gateway = request.Gateway;
            channel.IsActive = request.IsActive;
            channel.UpdatedAt = DateTime.UtcNow;

            // Update unit assignments if provided
            if (request.UnitIds != null)
            {
                // Remove assignments not in the new list
                var assignmentsToRemove = channel.UnitAssignments
                    .Where(ua => !request.UnitIds.Contains(ua.UnitId))
                    .ToList();

                foreach (var assignment in assignmentsToRemove)
                {
                    _context.UnitTransmissionChannels.Remove(assignment);
                }

                // Add new assignments
                var existingUnitIds = channel.UnitAssignments.Select(ua => ua.UnitId).ToList();
                var newUnitIds = request.UnitIds.Where(id => !existingUnitIds.Contains(id)).ToList();

                if (newUnitIds.Any())
                {
                    var units = await _context.Units
                        .Where(u => newUnitIds.Contains(u.Id))
                        .ToListAsync();

                    foreach (var unit in units)
                    {
                        channel.UnitAssignments.Add(new UnitTransmissionChannel
                        {
                            UnitId = unit.Id,
                            AssignedAt = DateTime.UtcNow,
                            AssignedBy = userId.ToString()
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();

            return MapToDto(channel);
        }

        public async Task<bool> DeleteChannelAsync(Guid userId, long channelId)
        {
            var channel = await _context.TransmissionChannels
                .Include(c => c.UnitAssignments)
                .FirstOrDefaultAsync(c => c.Id == channelId);

            if (channel == null)
                return false;

            _context.TransmissionChannels.Remove(channel);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<TransmissionChannelDto[]> GetChannelsByUnitAsync(Guid userId, long unitId)
        {
            // Verify unit exists
            var unit = await _context.Units.FindAsync(unitId);
            if (unit == null)
                return Array.Empty<TransmissionChannelDto>();

            var channels = await _context.TransmissionChannels
                .Include(c => c.UnitAssignments)
                    .ThenInclude(ua => ua.Unit)
                .Where(c => c.UnitAssignments.Any(ua => ua.UnitId == unitId))
                .OrderBy(c => c.Code)
                .ToListAsync();

            return channels.Select(c => MapToDto(c)).ToArray();
        }

        private TransmissionChannelDto MapToDto(TransmissionChannel channel)
        {
            return new TransmissionChannelDto
            {
                Id = channel.Id,
                ExternalId = channel.ExternalId,
                Code = channel.Code,
                Provider = channel.Provider,
                Bandwidth = channel.Bandwidth,
                VlanId = channel.VlanId,
                IpRangeStart = channel.IpRangeStart,
                IpRangeEnd = channel.IpRangeEnd,
                Subnet = channel.Subnet,
                Gateway = channel.Gateway,
                IsActive = channel.IsActive,
                CreatedAt = channel.CreatedAt,
                UpdatedAt = channel.UpdatedAt,
                UnitCount = channel.UnitAssignments.Count,
                Units = channel.UnitAssignments
                    .Where(ua => ua.Unit != null)
                    .Select(ua => new UnitSelectionDto
                    {
                        Id = ua.Unit!.Id,
                        Name = ua.Unit.Name,
                        Code = ua.Unit.Code
                    })
                    .ToArray()
            };
        }
    }
}