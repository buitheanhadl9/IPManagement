using IPManagement.API.DTOs;
using System;
using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public interface ITransmissionChannelService
    {
        Task<TransmissionChannelDto[]> GetAllChannelsAsync(Guid userId);
        Task<TransmissionChannelDto?> GetChannelByIdAsync(Guid userId, long channelId);
        Task<TransmissionChannelDto> CreateChannelAsync(Guid userId, TransmissionChannelCreateRequest request);
        Task<TransmissionChannelDto> UpdateChannelAsync(Guid userId, long channelId, TransmissionChannelUpdateRequest request);
        Task<bool> DeleteChannelAsync(Guid userId, long channelId);
        Task<TransmissionChannelDto[]> GetChannelsByUnitAsync(Guid userId, long unitId);
    }
}