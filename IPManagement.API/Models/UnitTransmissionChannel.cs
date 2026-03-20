using System;

namespace IPManagement.API.Models
{
    public class UnitTransmissionChannel
    {
        public long Id { get; set; }
        
        public long UnitId { get; set; }
        
        public long ChannelId { get; set; }
        
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        
        public string? AssignedBy { get; set; }
        
        public Unit Unit { get; set; } = null!;
        
        public TransmissionChannel Channel { get; set; } = null!;
    }
}